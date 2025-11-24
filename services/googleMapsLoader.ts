import { GOOGLE_MAPS_API_KEY } from '../constants';

let promise: Promise<void> | null = null;

export const loadGoogleMapsApi = (): Promise<void> => {
    if (promise) {
        return promise;
    }

    promise = new Promise((resolve, reject) => {
        // Add a check for the placeholder key to guide the developer
        // FIX: Cast GOOGLE_MAPS_API_KEY to string to allow comparison with a placeholder value without a TypeScript error.
        if (!GOOGLE_MAPS_API_KEY || (GOOGLE_MAPS_API_KEY as string) === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
            promise = null; // Reset for retry
            reject(new Error("Google Maps API key is not configured. Please add your key to the `GOOGLE_MAPS_API_KEY` constant in `constants.ts`."));
            return;
        }

        // If window.google is already available, resolve immediately
        if ((window as any).google?.maps) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            // The script can load successfully but the API can fail to initialize
            // (e.g., due to an invalid API key). Check for the global object.
            if ((window as any).google?.maps) {
                resolve();
            } else {
                promise = null; // Allow retrying on subsequent calls
                reject(new Error("Google Maps script loaded, but the API failed to initialize. Please check that your API key is correct and enabled for the Maps JavaScript API."));
            }
        };

        script.onerror = () => {
            promise = null; // Allow retrying
            reject(new Error("Failed to load the Google Maps script. Check your network connection."));
        };
        
        document.head.appendChild(script);
    });

    return promise;
};