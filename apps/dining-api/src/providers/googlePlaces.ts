import { DateTime } from 'luxon';
import { z } from 'zod/v4';
import type { ExternalLocation, IFullTimeRange } from 'types';

const pointSchema = z.object({
    day: z.number().int().min(0).max(6).default(0),
    hour: z.number().int().min(0).max(23).default(0),
    minute: z.number().int().min(0).max(59).default(0),
    date: z.object({ year: z.number().int(), month: z.number().int(), day: z.number().int() }).optional(),
});
const hoursSchema = z.object({
    periods: z.array(z.object({ open: pointSchema, close: pointSchema.optional() })).optional(),
});
const httpUrl = z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol));
export const googlePlaceSchema = z.object({
    id: z.string().min(1),
    displayName: z.object({ text: z.string().min(1) }),
    formattedAddress: z.string().min(1),
    location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
    websiteUri: httpUrl.optional(),
    googleMapsUri: httpUrl,
    businessStatus: z.enum(['OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY']).optional(),
    timeZone: z.object({ id: z.string() }).optional(),
    currentOpeningHours: hoursSchema.optional(),
    regularOpeningHours: hoursSchema.optional(),
});
type GooglePlace = z.infer<typeof googlePlaceSchema>;
type Point = z.infer<typeof pointSchema>;
export type ExternalLocationConfig = { googlePlaceID: string; description: string | null };
const FIELD_MASK =
    'id,displayName,formattedAddress,location,websiteUri,googleMapsUri,businessStatus,timeZone,currentOpeningHours,regularOpeningHours';
const DB_ZONE = 'America/New_York';

/** Structured periods only: weekday descriptions are localized display text. */
function openingTimes(place: GooglePlace, now: DateTime<true>): IFullTimeRange[] | null {
    if (place.businessStatus?.startsWith('CLOSED_')) return [];
    const current = place.currentOpeningHours;
    const periods = (current ?? place.regularOpeningHours)?.periods;
    if (!periods) return null;
    const today = now.setZone(place.timeZone?.id ?? DB_ZONE).startOf('day');
    if (!today.isValid) throw new Error('Invalid Google Places time zone');
    const windowEnd = today.plus({ days: 7 });
    const times: IFullTimeRange[] = [];

    function addPeriod(start: DateTime, end: DateTime) {
        if (!start.isValid || !end.isValid || end <= start) throw new Error('Invalid Google opening period');
        // The database stores calendar dates in Pittsburgh time. Split multi-day/24-hour periods.
        let cursor = DateTime.max(start, today, now.startOf('day')).setZone(DB_ZONE);
        const limit = DateTime.min(end, windowEnd).setZone(DB_ZONE);
        while (cursor < limit) {
            const midnight = cursor.plus({ days: 1 }).startOf('day');
            const finish = DateTime.min(limit, midnight);
            times.push({
                year: cursor.year,
                month: cursor.month,
                day: cursor.day,
                startMinutesFromMidnight: cursor.hour * 60 + cursor.minute,
                endMinutesFromMidnight: finish.equals(midnight) ? 1439 : finish.hour * 60 + finish.minute,
            });
            cursor = midnight;
        }
    }
    function at(point: Point, date: DateTime) {
        const day = point.date ? DateTime.fromObject(point.date, { zone: today.zoneName! }) : date;
        return day.set({ hour: point.hour, minute: point.minute });
    }
    for (const { open, close } of periods) {
        if (!close) {
            if (open.day !== 0 || open.hour !== 0 || open.minute !== 0) throw new Error('Missing Google closing time');
            addPeriod(today, windowEnd);
            continue;
        }
        if (current && open.date && close.date) {
            addPeriod(at(open, today), at(close, today));
            continue;
        }
        // Include last week's overnight period if it continues into today's window.
        for (let offset = -7; offset < 7; offset++) {
            const day = today.plus({ days: offset });
            if (day.weekday % 7 !== open.day) continue;
            const start = at(open, day);
            let end = at(close, day.plus({ days: (close.day - open.day + 7) % 7 }));
            if (end <= start) end = end.plus({ days: 7 });
            addPeriod(start, end);
        }
    }
    return times;
}

export function buildGoogleLocation(
    input: unknown,
    config: ExternalLocationConfig,
    now: DateTime = DateTime.now(),
): ExternalLocation {
    const place = googlePlaceSchema.parse(input);
    if (place.id !== config.googlePlaceID) throw new Error('Google Place ID does not match the requested location');
    const today = now.setZone(DB_ZONE);
    if (!today.isValid) throw new Error('Invalid refresh date');
    const times = openingTimes(place, today);
    return {
        conceptId: null,
        googlePlaceID: config.googlePlaceID,
        onCampus: false,
        name: place.displayName.text,
        location: place.formattedAddress,
        coordinates: place.location ? { lat: place.location.latitude, lng: place.location.longitude } : undefined,
        url: place.websiteUri ?? place.googleMapsUri,
        description: config.description,
        shortDescription: undefined,
        menu: null,
        acceptsOnlineOrders: null,
        todaysSpecials: null,
        todaysSoups: null,
        today: { year: today.year, month: today.month, day: today.day },
        times,
        hoursValidThrough: times === null ? null : today.plus({ days: 6 }).toSQLDate(),
    };
}

export async function fetchGoogleLocation(config: ExternalLocationConfig, apiKey: string): Promise<ExternalLocation> {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(config.googlePlaceID)}`;
    for (let attempt = 0; ; attempt++) {
        const response = await fetch(url, {
            headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
            signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) return buildGoogleLocation(await response.json(), config);
        if (attempt >= 2 || (response.status !== 429 && response.status < 500)) {
            throw new Error(`Google Places request failed (${response.status})`);
        }
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
}
