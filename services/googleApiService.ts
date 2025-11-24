

import { GOOGLE_MAPS_API_KEY } from '../constants';
import type { Property, AirQualityResponse, SolarPotentialResponse, PollenResponse, GeocodeResponse, RoutesResponse, RouteInfo, StreetViewMetadataResponse, AmenityFilter } from '../types';
import { loadGoogleMapsApi } from './googleMapsLoader';

// --- MOCK DATA ---
const mockAirQualityResponse: AirQualityResponse = {
  indexes: [{ aqi: 42, displayName: 'Universal Air Quality Index (UAQI)', category: 'Good', dominantPollutant: 'o3' }],
  pollutants: [
    { code: 'o3', displayName: 'Ozone', concentration: { value: 65, units: 'PPB' } },
    { code: 'pm25', displayName: 'PM2.5', concentration: { value: 8.5, units: 'UG_M3' } }
  ]
};

const mockSolarPotentialResponse: SolarPotentialResponse = {
  solarPotential: {
    maxArrayAreaMeters2: 150,
    carbonOffsetFactorKgPerMwh: 690,
    financialAnalyses: [{
      monthlyBill: { units: 'USD', nanos: 150000000000 },
      panelConfig: { panelsCount: 20, yearlyEnergyDcKwh: 8500 },
      financialDetails: {
        initialAcKwhPerYear: 8000,
        remainingLifetimeUtilityBill: { units: 'USD', nanos: 0 },
        savings: {
          savingsYear1: { units: 'USD', nanos: 550000000000 },
          savingsYear20: { units: 'USD', nanos: 12500000000000 }
        }
      }
    }]
  }
};

const mockPollenResponse: PollenResponse = {
  dailyInfo: [{
    date: { year: 2024, month: 7, day: 22 },
    pollenTypeInfo: [
      { code: 'GRASS', displayName: 'Grass', inSeason: true, indexInfo: { value: 2, category: 'Low' } },
      { code: 'TREE', displayName: 'Tree', inSeason: true, indexInfo: { value: 3, category: 'Moderate' } },
      { code: 'WEED', displayName: 'Weed', inSeason: false }
    ]
  }]
};

const mockRouteInfo: RouteInfo = {
    distance: 8046, // ~5 miles
    duration: "900s", // 15 minutes
    polyline: 'cbn~Fj`hjVf@~A`A|B`@Z`BlA`@b@XXz@f@t@l@j@^j@R`@J`@Fh@?p@Ez@Gb@Ih@Mf@S~@c@tAc@tA_@n@e@b@c@Xq@Pc@Dm@?a@Ca@Ic@Mc@O_@Qa@_@w@q@u@s@c@s@Wy@So@Io@Ek@@e@Bg@Fk@He@Ne@Ra@Vq@l@k@t@s@t@w@l@q@`@a@Zq@Xq@Nk@De@?_@C_@Ic@Mc@Qk@Si@Ui@Wg@Yg@We@c@s@u@q@u@o@i@k@Ye@Se@Oc@Kg@@i@Bg@Fg@He@Le@Na@P_@Pa@V_@Xa@d@e@n@g@r@e@t@k@l@k@j@s@l@q@j@o@l@a@n@e@d@e@f@e@f@_@d@_@f@e@f@e@d@c@b@_@`@e@f@_@d@a@b@g@b@g@b@g@`@e@b@g@`@e@b@g@`@e@`@e@`@g@b@_@`@e@`@_@b@g@`@e@b@_@b@e@`@e@b@_@b@g@`@_@`@e@b@_@b@e@`@e@b@_@b@_@b@e@`@g@b@e@`@_@`@_@b@e@`@g@b@e@`@_@`@_@b@e@`@g@`@e@`@e@b@_@`@g@`@e@b@_@`@_@b@_@'
};


// --- API SERVICE FUNCTIONS ---

const BASE_URL = 'https://maps.googleapis.com/v1';
const AIR_QUALITY_URL = 'https://airquality.googleapis.com/v1';
const SOLAR_URL = 'https://solar.googleapis.com/v1';
const POLLEN_URL = 'https://pollen.googleapis.com/v1';

const commonFetch = async <T>(url: string, body?: object): Promise<T> => {
    const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export const getStreetViewImageUrl = (lat: number, lng: number): string => {
    return `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lng}&fov=90&heading=235&pitch=10&key=${GOOGLE_MAPS_API_KEY}`;
};


export const fetchAirQuality = (lat: number, lng: number): Promise<AirQualityResponse> => {
    const url = `${AIR_QUALITY_URL}/currentConditions:lookup`;
    return commonFetch(url, { 
        location: { latitude: lat, longitude: lng },
        extraComputations: ['LOCAL_AQI'] 
    });
};

export const fetchSolarPotential = (lat: number, lng: number): Promise<SolarPotentialResponse> => {
    // const url = `${SOLAR_URL}/buildingInsights:findClosest?key=${GOOGLE_MAPS_API_KEY}`;
    // return commonFetch(url, { location: { latitude: lat, longitude: lng }, requiredQuality: 'MEDIUM' });
    console.log("Using mock solar potential data for:", { lat, lng });
    return new Promise(resolve => setTimeout(() => resolve(mockSolarPotentialResponse), 1200));
};

export const fetchPollenInfo = (lat: number, lng: number): Promise<PollenResponse> => {
    // const url = `${POLLEN_URL}/forecast:lookup?key=${GOOGLE_MAPS_API_KEY}`;
    // return commonFetch(url, { location: { latitude: lat, longitude: lng }, days: 3 });
    console.log("Using mock pollen data for:", { lat, lng });
    return new Promise(resolve => setTimeout(() => resolve(mockPollenResponse), 500));
};

export const geocodeAddress = async (address: string): Promise<GeocodeResponse> => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.error_message || `Geocoding failed with status: ${response.status}`);
            } catch (e) {
                throw new Error(`Geocoding failed with status: ${response.status}`);
            }
        }
        
        const data: GeocodeResponse = await response.json();

        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            throw new Error(`Geocoding API Error: ${data.status} - ${data.error_message || 'An unknown error occurred'}`);
        }
        
        return data;

    } catch (error) {
        console.error("Geocoding service error:", error);
        if (error instanceof Error) {
            throw new Error(`Geocoding service failed: ${error.message}`);
        }
        throw new Error('An unknown error occurred during geocoding.');
    }
};

export const findPlaceFromText = async (query: string): Promise<{ lat: number; lng: number; name: string; formatted_address: string } | null> => {
    // Use Google Maps Places API Find Place from Text
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=formatted_address,name,geometry&key=${GOOGLE_MAPS_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            return {
                lat: candidate.geometry.location.lat,
                lng: candidate.geometry.location.lng,
                name: candidate.name,
                formatted_address: candidate.formatted_address
            };
        }
        return null;
    } catch (e) {
        console.error("Error finding place:", e);
        return null;
    }
};

export const fetchDirections = async (
    origin: { lat: number, lng: number },
    destination: { lat: number, lng: number },
    travelMode: 'DRIVE' | 'TRANSIT' | 'WALK' | 'BICYCLE'
): Promise<RouteInfo> => {
    // const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    // const body = {
    //     origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    //     destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    //     travelMode: travelMode,
    //     routingPreference: 'TRAFFIC_AWARE',
    //     computeAlternativeRoutes: false,
    //     routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false },
    //     languageCode: 'en-US',
    //     units: 'IMPERIAL'
    // };
    
    // const response = await fetch(url, {
    //     method: 'POST',
    //     body: JSON.stringify(body),
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
    //         'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    //     },
    // });

    // if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.error?.message || 'Failed to fetch directions.');
    // }

    // const data: RoutesResponse = await response.json();

    // if (!data.routes || data.routes.length === 0) {
    //     throw new Error('No routes found for the selected mode of transport.');
    // }

    // return {
    //     distance: data.routes[0].distanceMeters,
    //     duration: data.routes[0].duration,
    //     polyline: data.routes[0].polyline?.encodedPolyline,
    // };
    console.log("Using mock directions data for:", { from: origin, to: destination, mode: travelMode });
    return new Promise(resolve => setTimeout(() => resolve(mockRouteInfo), 600));
};
