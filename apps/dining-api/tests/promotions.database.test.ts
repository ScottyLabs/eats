import { DateTime } from 'luxon';
import { eq } from 'drizzle-orm';
import { dbTest } from './dbstub';
import { locationDataTable, promotionsTable, externalGoogleLocationsTable } from 'db/schema';
import { getAllLocationsFromDB } from 'db/getLocations';
import { addLocationDataToDb } from 'db/updateLocation';
import { buildGoogleLocation } from 'providers/googlePlaces';

const now = DateTime.fromISO('2026-10-31T12:00:00Z') as DateTime<true>;

dbTest(
    'publishes active promotions, preserves nullable fields and survives location imports',
    async ({ ctx: { db } }) => {
        const config = { googlePlaceID: 'promo-cafe', description: null };
        await db.insert(externalGoogleLocationsTable).values(config);
        const location = buildGoogleLocation(
            {
                id: config.googlePlaceID,
                displayName: { text: 'Promo Cafe' },
                formattedAddress: 'Pittsburgh',
                googleMapsUri: 'https://maps.google.com/test',
            },
            config,
            now,
        );
        const placeId = await addLocationDataToDb(db, location);
        await db.insert(locationDataTable).values({ id: 'other', onCampus: true, url: '', location: '' });
        const [draft] = await db.insert(promotionsTable).values({ placeId }).returning();
        expect(draft?.status).toBe('draft');
        const active = await db
            .insert(promotionsTable)
            .values([
                { placeId, status: 'published', promotionGraphic: 'https://example.com/offer.png' },
                {
                    placeId,
                    status: 'published',
                    promotionTagText: '20% off',
                    promotionText: 'With student ID',
                    startsAt: now.toJSDate(),
                    endsAt: now.plus({ hours: 1 }).toJSDate(),
                },
            ])
            .returning();
        await db.insert(promotionsTable).values([
            { placeId, status: 'archived' },
            { placeId, status: 'published', startsAt: now.plus({ seconds: 1 }).toJSDate() },
            { placeId, status: 'published', endsAt: now.toJSDate() },
            { placeId, status: 'published', endsAt: now.minus({ seconds: 1 }).toJSDate() },
        ]);
        expect(await addLocationDataToDb(db, location)).toBe(placeId);
        const result = await getAllLocationsFromDB(db, now);
        expect(result.find((entry) => entry.id === placeId)?.promotions).toEqual(
            active.map((promotion) => ({
                ...promotion,
                startsAt: promotion.startsAt?.toISOString() ?? null,
                endsAt: promotion.endsAt?.toISOString() ?? null,
            })),
        );
        expect(result.find((entry) => entry.id === 'other')?.promotions).toEqual([]);
        expect(active[0]).toMatchObject({ promotionTagText: null, promotionText: null });
        expect(active[1]?.promotionGraphic).toBeNull();
        expect(await db.select().from(promotionsTable)).toHaveLength(7);
        await expect(db.insert(promotionsTable).values({ placeId: 'missing' })).rejects.toThrow();
        await db.delete(locationDataTable).where(eq(locationDataTable.id, placeId));
        expect(await db.select().from(promotionsTable)).toEqual([]);
    },
);
