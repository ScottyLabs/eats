import { DBType } from 'db/db';
import { addLocationDataToDb } from 'db/updateLocation';
import { env } from 'env';
import DiningParser from 'parser/diningParser';
import { ILocation } from 'types';
import { getDiffsBetweenLocationData } from 'utils/diff';
import ScrapeResultMerger from 'utils/locationMerger';
import { notifySlack } from 'utils/slack';
import { externalGoogleLocationsTable } from 'db/schema';
import { fetchGoogleLocation } from 'providers/googlePlaces';

const refreshes = new WeakMap<DBType, Promise<void>>();

/* Refresh entrypoint */
export async function refreshDB(db: DBType): Promise<void> {
    const active = refreshes.get(db);
    if (active) return active;
    const refresh = Promise.allSettled([refreshCampusLocations(db), refreshGoogleLocations(db)]).then((results) => {
        const failures = results.filter((result) => result.status === 'rejected');
        if (failures.length)
            throw new AggregateError(
                failures.map((result) => result.reason),
                'Location refresh failed',
            );
    });
    refreshes.set(db, refresh);
    try {
        await refresh;
    } finally {
        refreshes.delete(db);
    }
}

export async function refreshGoogleLocations(db: DBType): Promise<void> {
    const locations = await db.select().from(externalGoogleLocationsTable);
    if (!locations.length) return;
    const key = env.GOOGLE_PLACES_API_KEY;
    if (!key || key === 'YOUR_GOOGLE_PLACES_API_KEY') {
        console.warn('Skipping Google locations: configure GOOGLE_PLACES_API_KEY');
        return;
    }
    // batches of 3, should we make batch size a config?
    for (let start = 0; start < locations.length; start += 3) {
        await Promise.all(
            locations.slice(start, start + 3).map(async (config) => {
                try {
                    const location = await fetchGoogleLocation(config, key);
                    await addLocationDataToDb(db, location);
                } catch {
                    console.warn(`Could not refresh Google place ${config.googlePlaceID}; keeping previous data`);
                }
            }),
        );
    }
}

/** only used for Slack debug diff logging */
let cachedLocations: ILocation[] = [];
async function refreshCampusLocations(db: DBType): Promise<void> {
    const now = new Date();
    console.log(`Reloading Dining API: ${now}`);
    const parser = new DiningParser();
    const locationMerger = new ScrapeResultMerger();

    for (let i = 0; i < env.NUMBER_OF_SCRAPES; i++) {
        // Wait a bit before starting the next round of scrapes.
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, env.INTER_SCRAPE_WAIT_INTERVAL));

        const locations = await parser.process();
        locations.forEach((location) => locationMerger.addLocation(location));
    }
    const finalLocations = locationMerger.getMostFrequentLocations();
    if (finalLocations.length === 0) {
        notifySlack('<!channel> No data scraped! Skipping');
    } else {
        const diffs = getDiffsBetweenLocationData(cachedLocations, finalLocations);
        cachedLocations = finalLocations;

        if (diffs.length === 0) {
            notifySlack('Dining API reloaded (data unchanged)');
        } else {
            await notifySlack('Dining API reloaded with the following changes:');
            for (const diff of diffs) {
                await notifySlack(diff);
            }
        }

        await Promise.all(finalLocations.map((location) => addLocationDataToDb(db, location)));
    }
}
