import { DateTime } from 'luxon';
import { env } from 'env';
import type { DBType } from 'db/db';
import { externalGoogleLocationsTable } from 'db/schema';
import { addLocationDataToDb } from 'db/updateLocation';
import { buildGoogleLocation, fetchGoogleLocation, type ExternalLocationConfig } from 'providers/googlePlaces';
import DiningParser from 'parser/diningParser';
import { refreshDB, refreshGoogleLocations } from '../src/reload';

vi.mock('db/updateLocation', () => ({ addLocationDataToDb: vi.fn() }));
vi.mock('providers/googlePlaces', async (original) => ({
    ...(await original<object>()),
    fetchGoogleLocation: vi.fn(),
}));
vi.mock('parser/diningParser', () => ({
    default: vi.fn(
        class {
            process = vi.fn().mockResolvedValue([]);
        },
    ),
}));
vi.mock('utils/slack', () => ({ notifySlack: vi.fn() }));

const config = { googlePlaceID: 'test-place', description: null };
const location = buildGoogleLocation(
    {
        id: config.googlePlaceID,
        displayName: { text: 'Test Cafe' },
        formattedAddress: 'Pittsburgh',
        googleMapsUri: 'https://maps.google.com/test',
    },
    config,
    DateTime.now(),
);
const originalKey = env.GOOGLE_PLACES_API_KEY;
const originalScrapes = env.NUMBER_OF_SCRAPES;

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    env.GOOGLE_PLACES_API_KEY = 'test-key';
    env.NUMBER_OF_SCRAPES = 1;
    vi.mocked(fetchGoogleLocation).mockResolvedValue(location);
});
afterEach(() => {
    env.GOOGLE_PLACES_API_KEY = originalKey;
    env.NUMBER_OF_SCRAPES = originalScrapes;
    vi.restoreAllMocks();
});

function database(rows: ExternalLocationConfig[] = [config]) {
    const from = vi.fn().mockResolvedValue(rows);
    return { db: { select: () => ({ from }) } as unknown as DBType, from };
}

test('reads the curated table and passes the manual description to the provider', async () => {
    const row = { ...config, description: 'Coffee and pastries' };
    const { db, from } = database([row]);
    await refreshGoogleLocations(db);
    expect(from).toHaveBeenCalledWith(externalGoogleLocationsTable);
    expect(fetchGoogleLocation).toHaveBeenCalledWith(row, 'test-key');
    expect(addLocationDataToDb).toHaveBeenCalledWith(db, location);
});

test('missing and placeholder keys do not make paid requests', async () => {
    const { db } = database();
    for (const key of [undefined, '', 'YOUR_GOOGLE_PLACES_API_KEY']) {
        env.GOOGLE_PLACES_API_KEY = key;
        await refreshGoogleLocations(db);
    }
    expect(fetchGoogleLocation).not.toHaveBeenCalled();
});

test('a failed place is not written and does not stop other places', async () => {
    const { db } = database([config, { googlePlaceID: 'second', description: null }]);
    vi.mocked(fetchGoogleLocation).mockRejectedValueOnce(new Error('timeout'));
    await refreshGoogleLocations(db);
    expect(fetchGoogleLocation).toHaveBeenCalledTimes(2);
    expect(addLocationDataToDb).toHaveBeenCalledTimes(1);
});

test('overlapping refresh calls share one Google request', async () => {
    const { db } = database();
    await Promise.all([refreshDB(db), refreshDB(db)]);
    expect(fetchGoogleLocation).toHaveBeenCalledTimes(1);
});

test('a CMU failure does not stop the Google refresh', async () => {
    vi.mocked(DiningParser).mockImplementationOnce(
        class {
            process = vi.fn().mockRejectedValue(new Error('CMU unavailable'));
        } as unknown as typeof DiningParser,
    );
    const { db } = database();
    await expect(refreshDB(db)).rejects.toThrow('Location refresh failed');
    expect(addLocationDataToDb).toHaveBeenCalledWith(db, location);
});
