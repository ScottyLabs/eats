import { DateTime } from 'luxon';
import { buildGoogleLocation, fetchGoogleLocation } from '../src/providers/googlePlaces';

const now = DateTime.fromISO('2026-09-27T12:00:00', { zone: 'America/New_York' }); // Sunday
const config = { googlePlaceID: 'test-place', description: null };
const place = {
    id: config.googlePlaceID,
    displayName: { text: 'Test Cafe' },
    formattedAddress: 'Pittsburgh, PA',
    googleMapsUri: 'https://maps.google.com/test',
    timeZone: { id: 'America/New_York' },
};
const point = (day: number, hour: number, minute = 0) => ({ day, hour, minute });
const slot = (day: number, start: number, end: number) => ({
    year: 2026,
    month: 9,
    day,
    startMinutesFromMidnight: start,
    endMinutesFromMidnight: end,
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

test('unknown fields are null and the manual description is used only when supplied', () => {
    expect(buildGoogleLocation(place, config, now)).toMatchObject({
        conceptId: null,
        onCampus: false,
        googlePlaceID: 'test-place',
        menu: null,
        acceptsOnlineOrders: null,
        todaysSpecials: null,
        todaysSoups: null,
        description: null,
        times: null,
        hoursValidThrough: null,
        url: place.googleMapsUri,
    });
    expect(buildGoogleLocation(place, { ...config, description: 'Coffee and pastries' }, now).description).toBe(
        'Coffee and pastries',
    );
});

test('current dated hours override the regular schedule, including closures', () => {
    const input = {
        ...place,
        currentOpeningHours: {
            periods: [
                {
                    open: { ...point(0, 10), date: { year: 2026, month: 9, day: 27 } },
                    close: { ...point(0, 14), date: { year: 2026, month: 9, day: 27 } },
                },
            ],
        },
        regularOpeningHours: { periods: [{ open: point(0, 8), close: point(0, 18) }] },
    };
    expect(buildGoogleLocation(input, config, now).times).toEqual([slot(27, 600, 840)]);
    expect(buildGoogleLocation({ ...input, currentOpeningHours: { periods: [] } }, config, now).times).toEqual([]);
});

test('missing current periods stay unknown instead of falling back to possibly incorrect regular hours', () => {
    expect(
        buildGoogleLocation(
            {
                ...place,
                currentOpeningHours: {},
                regularOpeningHours: {
                    periods: [{ open: point(0, 8), close: point(0, 18) }],
                },
            },
            config,
            now,
        ).times,
    ).toBeNull();
});

test('regular hours include overnight carry-in from Saturday and split at midnight', () => {
    const result = buildGoogleLocation(
        {
            ...place,
            regularOpeningHours: {
                periods: [
                    { open: point(6, 22), close: point(0, 2) },
                    { open: point(0, 22), close: point(1, 2) },
                ],
            },
        },
        config,
        now,
    );
    expect(result.times).toEqual(expect.arrayContaining([slot(27, 0, 120), slot(27, 1320, 1439), slot(28, 0, 120)]));
    expect(result.hoursValidThrough).toBe('2026-10-03');
});

test('24/7 creates seven complete calendar days', () => {
    const result = buildGoogleLocation(
        { ...place, regularOpeningHours: { periods: [{ open: point(0, 0) }] } },
        config,
        now,
    );
    expect(result.times).toHaveLength(7);
    expect(result.times?.[0]).toEqual(slot(27, 0, 1439));
    expect(result.times?.[6]).toEqual({ ...slot(3, 0, 1439), month: 10 });
});

test('dated periods work over a year boundary and daylight saving time', () => {
    const date = DateTime.fromISO('2026-12-31T12:00:00', { zone: 'America/New_York' });
    const result = buildGoogleLocation(
        {
            ...place,
            currentOpeningHours: {
                periods: [
                    {
                        open: { ...point(4, 22), date: { year: 2026, month: 12, day: 31 } },
                        close: { ...point(5, 2), date: { year: 2027, month: 1, day: 1 } },
                    },
                ],
            },
        },
        config,
        date,
    );
    expect(result.times).toHaveLength(2);
    expect(result.times?.[1]).toEqual({
        year: 2027,
        month: 1,
        day: 1,
        startMinutesFromMidnight: 0,
        endMinutesFromMidnight: 120,
    });
    const dst = buildGoogleLocation(
        { ...place, regularOpeningHours: { periods: [{ open: point(0, 0) }] } },
        config,
        DateTime.fromISO('2026-11-01T12:00:00', { zone: 'America/New_York' }),
    );
    expect(dst.times).toHaveLength(7);
    expect(
        dst.times?.every((time) => time.startMinutesFromMidnight === 0 && time.endMinutesFromMidnight === 1439),
    ).toBe(true);
});

test('business closures override an otherwise open schedule', () => {
    expect(
        buildGoogleLocation(
            {
                ...place,
                businessStatus: 'CLOSED_TEMPORARILY',
                regularOpeningHours: {
                    periods: [{ open: point(0, 0) }],
                },
            },
            config,
            now,
        ).times,
    ).toEqual([]);
});

test('rejects invalid dates, IDs and unsafe URLs before writing anything', () => {
    expect(() => buildGoogleLocation({ ...place, id: 'different' }, config, now)).toThrow();
    expect(() => buildGoogleLocation({ ...place, websiteUri: 'javascript:alert(1)' }, config, now)).toThrow();
    expect(() =>
        buildGoogleLocation(
            {
                ...place,
                currentOpeningHours: {
                    periods: [
                        {
                            open: { ...point(0, 10), date: { year: 2026, month: 13, day: 1 } },
                            close: { ...point(0, 14), date: { year: 2026, month: 13, day: 1 } },
                        },
                    ],
                },
            },
            config,
            now,
        ),
    ).toThrow();
});

test('fetch uses the Places endpoint and headers, not a key in the URL', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(place));
    vi.stubGlobal('fetch', fetch);
    await fetchGoogleLocation(config, 'test-key');
    expect(fetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places/test-place',
        expect.objectContaining({
            headers: {
                'X-Goog-Api-Key': 'test-key',
                'X-Goog-FieldMask': expect.stringContaining('currentOpeningHours,regularOpeningHours'),
            },
        }),
    );
});

test('authentication errors are not retried or logged with response contents', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('sensitive error', { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    await expect(fetchGoogleLocation(config, 'test-key')).rejects.toThrow('Google Places request failed (403)');
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('retries rate limits with bounded backoff', async () => {
    vi.useFakeTimers();
    const fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 429 }))
        .mockResolvedValue(Response.json(place));
    vi.stubGlobal('fetch', fetch);
    const request = fetchGoogleLocation(config, 'test-key');
    await vi.runAllTimersAsync();
    await expect(request).resolves.toMatchObject({ googlePlaceID: config.googlePlaceID });
    expect(fetch).toHaveBeenCalledTimes(2);
});
