import { DateTime } from 'luxon';
import { eq } from 'drizzle-orm';
import { dbTest } from './dbstub';
import { externalGoogleLocationsTable, externalIdToInternalIdTable, locationDataTable, timesTable } from 'db/schema';
import { addLocationDataToDb, addTimeOverride, addWeeklyTimeOverride } from 'db/updateLocation';
import { getAllLocationsFromDB } from 'db/getLocations';
import { buildGoogleLocation } from 'providers/googlePlaces';

const now = DateTime.fromISO('2026-09-27T12:00:00', { zone: 'America/New_York' }) as DateTime<true>;
const config = { googlePlaceID: 'test-place', description: null };
const input = {
    id: config.googlePlaceID,
    displayName: { text: 'Test Cafe' },
    formattedAddress: 'Pittsburgh, PA',
    googleMapsUri: 'https://maps.google.com/test',
    regularOpeningHours: { periods: [{ open: { day: 0, hour: 10 }, close: { day: 0, hour: 18 } }] },
};

dbTest('imports, updates and hides external locations without losing their identity', async ({ ctx: { db } }) => {
    await db.insert(externalGoogleLocationsTable).values({ googlePlaceID: config.googlePlaceID });
    expect(await db.select().from(externalGoogleLocationsTable)).toEqual([config]);
    const location = buildGoogleLocation(input, config, now);
    const ids = await Promise.all([addLocationDataToDb(db, location), addLocationDataToDb(db, location)]);
    expect(ids[0]).toBe(ids[1]);
    expect(await db.select().from(locationDataTable)).toHaveLength(1);
    expect(await db.select().from(timesTable)).toHaveLength(1);
    expect(await db.select().from(externalIdToInternalIdTable)).toEqual([]);
    expect(await getAllLocationsFromDB(db, now)).toEqual([
        expect.objectContaining({
            id: ids[0],
            conceptId: null,
            googlePlaceID: config.googlePlaceID,
            onCampus: false,
            menu: null,
            acceptsOnlineOrders: null,
            todaysSpecials: null,
            todaysSoups: null,
            description: null,
        }),
    ]);

    const description = 'Coffee and pastries';
    await db
        .update(externalGoogleLocationsTable)
        .set({ description })
        .where(eq(externalGoogleLocationsTable.googlePlaceID, config.googlePlaceID));
    const [updated] = await db.select().from(externalGoogleLocationsTable);
    expect(await addLocationDataToDb(db, buildGoogleLocation(input, updated!, now))).toBe(ids[0]);
    expect((await getAllLocationsFromDB(db, now))[0]?.description).toBe(description);
    expect((await getAllLocationsFromDB(db, now))[0]?.menu).toBeNull();
    expect((await getAllLocationsFromDB(db, now.plus({ days: 7 })))[0]?.times).toBeNull();

    await db
        .delete(externalGoogleLocationsTable)
        .where(eq(externalGoogleLocationsTable.googlePlaceID, config.googlePlaceID));
    expect(await getAllLocationsFromDB(db, now)).toEqual([]);
    expect(await db.select().from(locationDataTable)).toHaveLength(1);
});

dbTest('unknown and known closed schedules remain distinct in the API', async ({ ctx: { db } }) => {
    await db.insert(externalGoogleLocationsTable).values(config);
    await addLocationDataToDb(db, buildGoogleLocation({ ...input, regularOpeningHours: undefined }, config, now));
    expect((await getAllLocationsFromDB(db, now))[0]?.times).toBeNull();
    await addLocationDataToDb(db, buildGoogleLocation({ ...input, currentOpeningHours: { periods: [] } }, config, now));
    expect((await getAllLocationsFromDB(db, now))[0]?.times).toEqual([]);
});

for (const hours of ['unknown', 'expired'] as const) {
    dbTest(`manual overrides remain usable with ${hours} Google hours`, async ({ ctx: { db } }) => {
        await db.insert(externalGoogleLocationsTable).values(config);
        const location = buildGoogleLocation(
            { ...input, regularOpeningHours: hours === 'unknown' ? undefined : input.regularOpeningHours },
            config,
            now,
        );
        const id = await addLocationDataToDb(db, {
            ...location,
            hoursValidThrough: hours === 'unknown' ? null : now.minus({ days: 1 }).toSQLDate(),
        });
        expect((await getAllLocationsFromDB(db, now))[0]?.times).toBeNull();

        // Monday's override must not bring back Sunday's expired imported hours.
        await addTimeOverride(db, id, '9/28/26', '9:00 AM - 5:00 PM');
        expect((await getAllLocationsFromDB(db, now))[0]?.times).toEqual([
            {
                start: now.plus({ days: 1 }).set({ hour: 9 }).toMillis(),
                end: now.plus({ days: 1 }).set({ hour: 17 }).toMillis(),
            },
        ]);

        await addWeeklyTimeOverride(db, id, 0, '8:00 AM - 6:00 PM');
        await addWeeklyTimeOverride(db, id, 1, '8:00 AM - 6:00 PM');
        expect((await getAllLocationsFromDB(db, now))[0]?.times).toEqual([
            { start: now.set({ hour: 8 }).toMillis(), end: now.set({ hour: 18 }).toMillis() },
            {
                start: now.plus({ days: 1 }).set({ hour: 9 }).toMillis(),
                end: now.plus({ days: 1 }).set({ hour: 17 }).toMillis(),
            },
        ]);

        // Explicit closures still override weekly hours and produce a known empty schedule.
        await addTimeOverride(db, id, '9/27/26', 'CLOSED');
        await addTimeOverride(db, id, '9/28/26', 'CLOSED');
        expect((await getAllLocationsFromDB(db, now))[0]?.times).toEqual([]);
    });
}
