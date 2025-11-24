import React, { useState, useEffect, useRef } from 'react';
import { geocodeAddress, fetchDirections } from '../services/googleApiService';
import type { RouteInfo } from '../types';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';

interface CommuteCalculatorProps {
    origin: { lat: number; lng: number };
    onRouteCalculated: (polyline: string | null) => void;
}

type TravelMode = 'DRIVE' | 'TRANSIT' | 'WALK' | 'BICYCLE';

const TravelModeButton: React.FC<{
    mode: TravelMode;
    icon: string;
    label: string;
    activeMode: TravelMode;
    onClick: (mode: TravelMode) => void;
}> = ({ mode, icon, label, activeMode, onClick }) => (
    <button
        onClick={() => onClick(mode)}
        className={`flex-1 p-3 rounded-lg flex items-center justify-center gap-2 transition ${
            activeMode === mode 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
    >
        <i className={`fa-solid ${icon}`}></i>
        <span className="hidden sm:inline">{label}</span>
    </button>
);


const CommuteCalculator: React.FC<CommuteCalculatorProps> = ({ origin, onRouteCalculated }) => {
    const [destination, setDestination] = useState('');
    const [travelMode, setTravelMode] = useState<TravelMode>('DRIVE');
    const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const autocompleteRef = useRef<HTMLInputElement>(null);
    const autocompleteInstance = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        const initAutocomplete = async () => {
            await loadGoogleMapsApi();
            if (autocompleteRef.current && !autocompleteInstance.current) {
                autocompleteInstance.current = new window.google.maps.places.Autocomplete(
                    autocompleteRef.current,
                    { types: ['address'], fields: ['formatted_address'] }
                );
                autocompleteInstance.current.addListener('place_changed', () => {
                    const place = autocompleteInstance.current?.getPlace();
                    if (place?.formatted_address) {
                        setDestination(place.formatted_address);
                    }
                });
            }
        };

        initAutocomplete();
    }, []);

    const handleCalculate = async () => {
        if (!destination) {
            setError('Please enter a destination.');
            return;
        }

        setLoading(true);
        setError(null);
        setRouteInfo(null);
        onRouteCalculated(null);

        try {
            const geocodeData = await geocodeAddress(destination);
            if (!geocodeData.results || geocodeData.results.length === 0) {
                throw new Error('Could not find location. Please try a different address.');
            }
            const destCoords = geocodeData.results[0].geometry.location;
            const directions = await fetchDirections(origin, destCoords, travelMode);
            setRouteInfo(directions);
            if (directions.polyline) {
                onRouteCalculated(directions.polyline);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            onRouteCalculated(null);
        } finally {
            setLoading(false);
        }
    };
    
    const formatDuration = (durationString: string): string => {
        const seconds = parseInt(durationString.replace('s', ''), 10);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} min`;
    };

    const formatDistance = (meters: number): string => {
        const miles = meters * 0.000621371;
        return `${miles.toFixed(1)} mi`;
    };


    return (
        <div className="mt-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Commute Calculator</h3>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input
                        ref={autocompleteRef} 
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Enter destination address"
                        className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                        onClick={handleCalculate}
                        disabled={loading}
                        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition flex items-center justify-center"
                    >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : "Calculate"}
                    </button>
                </div>
                <div className="flex gap-2 mb-4">
                    <TravelModeButton mode="DRIVE" icon="fa-car" label="Driving" activeMode={travelMode} onClick={setTravelMode} />
                    <TravelModeButton mode="TRANSIT" icon="fa-bus" label="Transit" activeMode={travelMode} onClick={setTravelMode} />
                    <TravelModeButton mode="WALK" icon="fa-person-walking" label="Walk" activeMode={travelMode} onClick={setTravelMode} />
                    <TravelModeButton mode="BICYCLE" icon="fa-bicycle" label="Bike" activeMode={travelMode} onClick={setTravelMode} />
                </div>
                {error && <p className="text-red-500 text-center">{error}</p>}
                {routeInfo && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-center">
                        <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{formatDuration(routeInfo.duration)}</p>
                        <p className="text-gray-600 dark:text-gray-400">{formatDistance(routeInfo.distance)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommuteCalculator;