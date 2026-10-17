import { fetchClient } from '../api';

const MAPKIT_SCRIPT_URL = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';

let mapkitLoad: Promise<void> | undefined;

export async function fetchMapkitToken(): Promise<string> {
    const { data, response } = await fetchClient.GET('/mapkit-token');
    if (data === undefined) {
        throw new Error(`Failed to fetch MapKit token (${response.status})`);
    }
    return data.token;
}

// A custom mapkit-react loader. The library's default loader does not refresh the token
// after expiring, so we install our own `authorizationCallback` for mapkit js instead.
// It will call this function whenever it needs a new token.
//
// Note that this can be optimized after this pr for mapkit-react passes:
// https://github.com/Nicolapps/mapkit-react/pull/84
export function loadMapkit(): Promise<void> {
    mapkitLoad ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = MAPKIT_SCRIPT_URL;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            mapkit.init({
                authorizationCallback: (done) => {
                    fetchMapkitToken()
                        .then(done)
                        .catch((error) => console.error('Failed to fetch a MapKit token', error));
                },
            });
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load MapKit JS'));
        document.head.appendChild(script);
    }).catch((error) => {
        // Don't cache the failure, so a later call can retry loading the script.
        mapkitLoad = undefined;
        throw error;
    });
    return mapkitLoad;
}
