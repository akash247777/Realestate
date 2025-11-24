import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';
import { useTheme } from '../contexts/ThemeContext';

// FIX: Correctly declare Google Maps API types in the global scope for module consumption.
declare global {
    namespace google.maps {
        // FIX: Add LatLngLiteral interface to resolve typing error on line 39.
        interface LatLngLiteral {
            lat: number;
            lng: number;
        }

        // FIX: Add MapsEventListener interface to resolve typing error on line 41.
        interface MapsEventListener {
            remove(): void;
        }
        
        // FIX: Add MapMouseEvent for Street View click handler
        interface MapMouseEvent {
            latLng: LatLng;
        }

        class LatLng {
            constructor(lat: number, lng: number);
            lat(): number;
            lng(): number;
        }
        class Map {
            constructor(mapDiv: Element | null, opts?: any);
            getStreetView(): StreetViewPanorama;
            setOptions(options: any): void;
            controls: any[];
            addListener(eventName: string, handler: Function): google.maps.MapsEventListener;
            fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral): void;
            getMapTypeId(): string;
            setMapTypeId(mapTypeId: string): void;
        }
        class LatLngBounds {
            constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
            extend(point: LatLng | LatLngLiteral): void;
        }
        interface LatLngBoundsLiteral {
            east: number;
            north: number;
            south: number;
            west: number;
        }
        class Marker {
            constructor(opts?: any);
            addListener(eventName: string, handler: Function): void;
            setMap(map: Map | null): void;
        }
        class InfoWindow {
            constructor(opts?: any);
            setContent(content: string | Element): void;
            open(map: Map, anchor?: any): void;
        }
        class Size {
            constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
        }
        class Point {
            constructor(x: number, y: number);
        }
        class Polyline {
            constructor(opts?: any);
            setMap(map: Map | null): void;
        }
        class BicyclingLayer {
            constructor();
            getMap(): Map | null;
            setMap(map: Map | null): void;
        }
        class StreetViewPanorama {
            constructor(container: HTMLElement, opts?: any);
            getVisible(): boolean;
            setVisible(visible: boolean): void;
            setPosition(latLng: LatLng | google.maps.LatLngLiteral): void;
            setPov(pov: any): void;
            addListener(eventName: string, handler: Function): google.maps.MapsEventListener;
            setOptions(options: any): void;
        }
        class StreetViewService {
            getPanorama(request: any, callback: (data: StreetViewPanoramaData | null, status: StreetViewStatus) => void): void;
        }
        class StreetViewCoverageLayer {
            constructor();
            getMap(): Map | null;
            setMap(map: Map | null): void;
        }
        interface StreetViewPanoramaData {
            location?: {
                latLng: LatLng
            };
        }
        enum StreetViewStatus {
            OK = 'OK',
            ZERO_RESULTS = 'ZERO_RESULTS',
        }
        namespace geometry {
            namespace spherical {
                function computeHeading(from: LatLng, to: LatLng): number;
            }
            namespace encoding {
                function decodePath(encodedPath: string): LatLng[];
            }
        }
        namespace places {
            // FIX: Add Autocomplete definition to resolve typing error in CommuteCalculator.
            class Autocomplete {
                constructor(inputElement: HTMLInputElement, opts?: any);
                getPlace(): PlaceResult;
                addListener(eventName: string, handler: Function): void;
            }
            class PlacesService {
                constructor(attrContainer: any);
                nearbySearch(request: any, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void;
            }
            interface PlaceSearchRequest {
                location?: LatLng | LatLngLiteral;
                radius?: number;
                type?: string;
            }
            interface PlaceResult {
                geometry?: {
                    location: LatLng;
                };
                name?: string;
                vicinity?: string;
                place_id?: string;
                rating?: number;
                user_ratings_total?: number;
                business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
                formatted_address?: string;
            }
            const enum PlacesServiceStatus {
                OK = "OK",
                ZERO_RESULTS = "ZERO_RESULTS",
            }
        }
        enum MapTypeControlStyle {
            DEFAULT,
            DROPDOWN_MENU,
            HORIZONTAL_BAR,
        }
        enum ControlPosition {
            BOTTOM_CENTER,
            BOTTOM_LEFT,
            BOTTOM_RIGHT,
            LEFT_BOTTOM,
            LEFT_CENTER,
            LEFT_TOP,
            RIGHT_BOTTOM,
            RIGHT_CENTER,
            RIGHT_TOP,
            TOP_CENTER,
            TOP_LEFT,
            TOP_RIGHT,
        }
    }

    interface Window {
        google: any;
    }
}

const mapDarkStyle = [{"elementType":"geometry","stylers":[{"color":"#242f3e"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#242f3e"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#746855"}]},{"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#d59563"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#d59563"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#263c3f"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#6b9a76"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#38414e"}]},{"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#212a37"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#9ca5b3"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#746855"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#1f2835"}]},{"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#f3d19c"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#2f3948"}]},{"featureType":"transit.station","elementType":"labels.text.fill","stylers":[{"color":"#d59563"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#17263c"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#515c6d"}]},{"featureType":"water","elementType":"labels.text.stroke","stylers":[{"color":"#17263c"}]}];

const calculateDistance = (p1: { lat: number, lng: number }, p2: google.maps.LatLng): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (p2.lat() - p1.lat) * (Math.PI / 180);
    const dLon = (p2.lng() - p1.lng) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat() * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const formatDistance = (km: number): string => {
    if (km < 1) {
        return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
};

const PLACE_TYPES = [
    { type: 'school', name: 'Schools', icon: 'fa-school', color: 'text-blue-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', pillColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
    { type: 'hospital', name: 'Hospitals', icon: 'fa-hospital', color: 'text-red-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', pillColor: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
    { type: 'pharmacy', name: 'Pharmacies', icon: 'fa-pills', color: 'text-teal-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png', pillColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200' },
    { type: 'transit_station', name: 'Transit', icon: 'fa-train-subway', color: 'text-purple-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png', pillColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' },
    { type: 'restaurant', name: 'Restaurants', icon: 'fa-utensils', color: 'text-orange-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png', pillColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' },
    { type: 'shopping_mall', name: 'Malls', icon: 'fa-shopping-bag', color: 'text-pink-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/pink-dot.png', pillColor: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200' },
    { type: 'atm', name: 'ATMs', icon: 'fa-credit-card', color: 'text-lime-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/pink-dot.png', pillColor: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200' },
    { type: 'grocery_or_supermarket', name: 'Groceries', icon: 'fa-shopping-cart', color: 'text-indigo-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/ltblue-dot.png', pillColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200' },
    { type: 'park', name: 'Parks', icon: 'fa-tree', color: 'text-green-500', markerIcon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', pillColor: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
];

interface MapComponentProps {
    lat: number;
    lng: number;
    address: string;
    routePolyline?: string | null;
}

interface NearbyPlace extends google.maps.places.PlaceResult {
    distance: number;
    category: typeof PLACE_TYPES[0];
}

interface PlaceSummary {
    type: string;
    name: string;
    icon: string;
    color: string;
    pillColor: string;
    count: number;
    places: NearbyPlace[];
}


const MapComponent: React.FC<MapComponentProps> = ({ lat, lng, address, routePolyline }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const routePolylineRef = useRef<google.maps.Polyline | null>(null);
    const { theme } = useTheme();
    const [placeSummaries, setPlaceSummaries] = useState<PlaceSummary[]>(
        PLACE_TYPES.map(pt => ({ ...pt, count: 0, places: [] }))
    );
    const [error, setError] = useState<string | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);

    useEffect(() => {
        let isMounted = true;

        const initMapAndPlaces = () => {
            if (!mapRef.current) return;
            const propertyLocation = { lat, lng };
            
            const map = new google.maps.Map(mapRef.current, {
                center: propertyLocation,
                zoom: 13,
                streetViewControl: false,
                fullscreenControl: false,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                    position: google.maps.ControlPosition.TOP_RIGHT,
                    mapTypeIds: ['roadmap', 'satellite', 'hybrid'],
                },
            });
            mapInstanceRef.current = map;
            
            // Custom Street View Control
            const streetViewControlDiv = document.createElement('div');
            const streetViewButton = document.createElement('button');
            // FIX: Replaced the unreliable Font Awesome icon with a robust inline SVG to ensure it always renders correctly within the map's custom control context.
            streetViewButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" 24" fill="#424242">
                    <path d="M12 5.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM12 13c-2.76 0-5.05-1.1-6.79-2.82C5.07 10.04 5 9.82 5 9.58V8.9c0-.28.1-.55.29-.75.19-.2.46-.31.73-.31h11.96c.27 0 .54.11.73.31.19.2.29.47.29.75v.68c0 .24-.07.46-.21.64C17.05 11.9 14.76 13 12 13zm-7 5.5c0-1.38 2-2.5 4.5-2.5h5c2.5 0 4.5 1.12 4.5 2.5V20H5v-1.5z"/>
                </svg>`;
            streetViewButton.style.backgroundColor = '#fff';
            streetViewButton.style.border = 'none';
            streetViewButton.style.width = '40px';
            streetViewButton.style.height = '40px';
            streetViewButton.style.borderRadius = '2px';
            streetViewButton.style.boxShadow = 'rgba(0, 0, 0, 0.3) 0px 1px 4px -1px';
            streetViewButton.style.cursor = 'pointer';
            streetViewButton.style.marginRight = '10px';
            streetViewButton.style.marginBottom = '10px';
            // FIX: Added flex properties to properly center the new SVG icon within the button, ensuring a clean appearance.
            streetViewButton.style.display = 'flex';
            streetViewButton.style.alignItems = 'center';
            streetViewButton.style.justifyContent = 'center';
            streetViewButton.title = 'Click to toggle Street View';
            streetViewControlDiv.appendChild(streetViewButton);
            map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(streetViewControlDiv);

            // Custom Biking Layer Control
            const bikingControlDiv = document.createElement('div');
            const bikingButton = document.createElement('button');
            bikingButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#424242"><path d="M0 0h24v24H0z" fill="none"/><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-1.8-6H8.9L5.2 13.2C4.5 14.3 5.3 15 6.5 15h11c1.2 0 2-1.3 1.3-2.3L15.2 6zM8.5 18H14v-2.5c0-1.1-.9-2-2-2h-1.5c-1.1 0-2 .9-2 2V18z"/></svg>`;
            bikingButton.style.backgroundColor = '#fff';
            bikingButton.style.border = 'none';
            bikingButton.style.width = '40px';
            bikingButton.style.height = '40px';
            bikingButton.style.borderRadius = '2px';
            bikingButton.style.boxShadow = 'rgba(0, 0, 0, 0.3) 0px 1px 4px -1px';
            bikingButton.style.cursor = 'pointer';
            bikingButton.style.marginRight = '10px';
            bikingButton.style.display = 'flex';
            bikingButton.style.alignItems = 'center';
            bikingButton.style.justifyContent = 'center';
            bikingButton.title = 'Click to toggle bike paths';
            bikingControlDiv.appendChild(bikingButton);
            map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(bikingControlDiv);
            
            const panorama = map.getStreetView();
            panorama.setOptions({ enableCloseButton: true });

            const streetViewLayer = new google.maps.StreetViewCoverageLayer();
            const streetViewService = new google.maps.StreetViewService();
            let mapClickListener: google.maps.MapsEventListener | null = null;

            const disableStreetViewLayer = () => {
                streetViewLayer.setMap(null);
                streetViewButton.style.backgroundColor = '#fff';
                if (mapClickListener) {
                    mapClickListener.remove();
                    mapClickListener = null;
                }
            };

            const enableStreetViewLayer = () => {
                streetViewLayer.setMap(map);
                streetViewButton.style.backgroundColor = '#e0e0e0';

                mapClickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
                    if (e.latLng) {
                        streetViewService.getPanorama({ location: e.latLng, radius: 50 }, (data, status) => {
                            if (status === google.maps.StreetViewStatus.OK) {
                                panorama.setPosition(e.latLng);
                                panorama.setVisible(true);
                            }
                        });
                    }
                });
            };

            streetViewButton.addEventListener('click', () => {
                if (streetViewLayer.getMap()) {
                    disableStreetViewLayer();
                } else {
                    enableStreetViewLayer();
                }
            });

            panorama.addListener('visible_changed', () => {
                if (!panorama.getVisible()) {
                    disableStreetViewLayer();
                }
            });
            
            const bikingLayer = new google.maps.BicyclingLayer();
            let isBikingLayerVisible = false;

            bikingButton.addEventListener('click', () => {
                isBikingLayerVisible = !isBikingLayerVisible;
                if (isBikingLayerVisible) {
                    bikingLayer.setMap(map);
                    bikingButton.style.backgroundColor = '#e0e0e0';
                    if (map.getMapTypeId() === 'satellite') {
                        map.setMapTypeId('hybrid');
                    }
                } else {
                    bikingLayer.setMap(null);
                    bikingButton.style.backgroundColor = '#fff';
                }
            });
            
            map.addListener('maptypeid_changed', () => {
                if (map.getMapTypeId() === 'satellite' && isBikingLayerVisible) {
                    setTimeout(() => map.setMapTypeId('hybrid'), 10);
                }
            });

            const placesService = new google.maps.places.PlacesService(map);
            const infoWindow = new google.maps.InfoWindow();

            const propertyMarker = new google.maps.Marker({
                position: propertyLocation,
                map,
                title: address,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" height="48" width="48" viewBox="0 0 48 48"><path fill="#1d4ed8" d="M11.8 46V28.2H7.2V17.5L24 4.5l16.8 13v10.7h-4.6V28.2h-4.6v17.8Z"/></svg>'),
                    scaledSize: new google.maps.Size(48, 48),
                    anchor: new google.maps.Point(24, 48),
                },
                zIndex: 1000 // Ensure it's always on top
            });

            propertyMarker.addListener('click', () => {
                infoWindow.setContent(`<div class="p-1 font-sans"><p class="font-bold">Property Location</p><p>${address}</p></div>`);
                infoWindow.open(map, propertyMarker);
            });
            markersRef.current.push(propertyMarker);

            let allFoundPlaces: NearbyPlace[] = [];
            let pendingSearches = PLACE_TYPES.length;
            const summaries: PlaceSummary[] = JSON.parse(JSON.stringify(PLACE_TYPES.map(pt => ({ ...pt, count: 0, places: [] }))));

            const addNearbyMarker = (place: NearbyPlace) => {
                if (!place.geometry?.location) return;
                const marker = new google.maps.Marker({ map, position: place.geometry.location, icon: { url: place.category.markerIcon } });
                marker.addListener("click", () => {
                    infoWindow.setContent(`<div class="p-1 font-sans"><p class="font-bold">${place.name}</p><p class="text-sm">${place.category.name}</p><p class="text-xs text-blue-600">${place.distance.toFixed(2)} km away</p></div>`);
                    infoWindow.open(map, marker);
                });
                markersRef.current.push(marker);
            };

            PLACE_TYPES.forEach((placeType, index) => {
                placesService.nearbySearch({ location: propertyLocation, radius: 5000, type: placeType.type, fields: ['name', 'geometry', 'vicinity', 'place_id', 'business_status', 'rating', 'user_ratings_total'] }, (results, searchStatus) => {
                    if (searchStatus === google.maps.places.PlacesServiceStatus.OK && results) {
                        const categorizedPlaces: NearbyPlace[] = [];
                        results.forEach(place => {
                            if (place.geometry?.location && place.business_status !== 'CLOSED_PERMANENTLY') {
                                const distance = calculateDistance(propertyLocation, place.geometry.location);
                                const newPlace = { ...place, distance, category: placeType };
                                categorizedPlaces.push(newPlace);
                                allFoundPlaces.push(newPlace);
                            }
                        });
                        summaries[index].places = categorizedPlaces.sort((a,b) => a.distance - b.distance);
                        summaries[index].count = categorizedPlaces.length;
                    }
                    
                    pendingSearches--;
                    if (pendingSearches === 0) {
                        if (isMounted) {
                            setPlaceSummaries(summaries);
                            allFoundPlaces.forEach(place => addNearbyMarker(place));
                        }
                    }
                });
            });
        };
        
        const loadAndInit = async () => {
            try {
                setError(null);
                await loadGoogleMapsApi();
                if (isMounted) {
                    initMapAndPlaces();
                }
            } catch (err: any) {
                console.error("Failed to load Google Maps for MapComponent:", err);
                if (isMounted) {
                    setError(err.message || "An unknown error occurred while loading the map.");
                }
            }
        };

        loadAndInit();

        return () => {
            isMounted = false;
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];
        };
    }, [lat, lng, address, theme]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Clear existing polyline
        if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
        }

        if (routePolyline) {
            try {
                const decodedPath = google.maps.geometry.encoding.decodePath(routePolyline);
                const route = new google.maps.Polyline({
                    path: decodedPath,
                    geodesic: true,
                    strokeColor: '#1a73e8',
                    strokeOpacity: 0.8,
                    strokeWeight: 6,
                });
                route.setMap(map);
                routePolylineRef.current = route;

                // Fit map to route bounds
                const bounds = new google.maps.LatLngBounds();
                decodedPath.forEach(latLng => bounds.extend(latLng));
                map.fitBounds(bounds);
            } catch (e) {
                console.error("Error decoding or drawing polyline:", e);
            }
        }
    }, [routePolyline]);

    if (error) {
        return (
             <div className="p-8 text-center bg-red-50 border border-red-300 text-red-700 rounded-lg">
                <p className="font-bold">Map Error</p>
                <p>{error}</p>
            </div>
        )
    }

    const Rating: React.FC<{ rating?: number, total?: number }> = ({ rating, total }) => {
        if (!rating || !total) return null;
        return (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <i className="fa-solid fa-star text-yellow-500"></i>
                <span className="font-bold">{rating.toFixed(1)}</span>
                <span className="text-xs">({total})</span>
            </div>
        );
    };

    return (
        <div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Location</h3>
            <div ref={mapRef} className="h-96 rounded-xl shadow-lg mb-8 bg-gray-200 dark:bg-gray-700 border dark:border-gray-600"></div>
            
            <div className="mt-8">
                <h4 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">Nearby Places</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {placeSummaries.map((summary) => (
                        <div key={summary.type} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-4 pb-3 border-b dark:border-gray-600">
                                <div className="flex items-center gap-3">
                                    <i className={`fa-solid ${summary.icon} text-lg ${summary.color}`}></i>
                                    <h5 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{summary.name}</h5>
                                </div>
                                <span className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-bold px-3 py-1 rounded-full">
                                    {summary.count}
                                </span>
                            </div>
                            
                            <div className="space-y-3 overflow-y-auto pr-2" style={{maxHeight: '400px'}}>
                                {summary.places.length > 0 ? (
                                    summary.places.map((place) => (
                                        <div key={place.place_id} className="bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-600 p-3 rounded-lg shadow-sm">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{place.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">{place.vicinity}</p>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${summary.pillColor}`}>
                                                    {formatDistance(place.distance)}
                                                </span>
                                                <Rating rating={place.rating} total={place.user_ratings_total} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center py-4">
                                        No {summary.name.toLowerCase()} found nearby
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MapComponent;
