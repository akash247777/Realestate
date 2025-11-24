import React, { useState, useEffect, useCallback } from 'react';
import type { Property, AirQualityResponse, SolarPotentialResponse, PollenResponse } from '../types';
import MapComponent from './MapComponent';
import AILocationAnalysis from './AILocationAnalysis';
import GalleryAndStreetView from './GalleryAndStreetView';
import EnvironmentalInsights from './EnvironmentalInsights';
import CommuteCalculator from './CommuteCalculator';
import { GoogleGenAI, Type } from '@google/genai';
import { loadGoogleMapsApi } from '../services/googleMapsLoader';
import { fetchAirQuality, fetchSolarPotential, fetchPollenInfo } from '../services/googleApiService';
import { useTheme } from '../contexts/ThemeContext';


// Helper components defined outside the main component to prevent re-renders
const TabButton: React.FC<{ tabName: string; activeTab: string; label: string; onClick: (tab: string) => void; disabled?: boolean; icon: string; }> = ({ tabName, activeTab, label, onClick, disabled, icon }) => {
    const isActive = tabName === activeTab;
    return (
        <button
            data-tab={tabName}
            onClick={() => !disabled && onClick(tabName)}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-3 text-sm transition duration-150 rounded-t-lg ${
                isActive ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <i className={`fa-solid ${icon}`}></i>
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
};

const Feature: React.FC<{ label: string; value: string | number | undefined | null }> = ({ label, value }) => {
    if (!value || value === 'N/A') return null;
    return (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
            <dt className="font-medium text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="mt-1 font-bold text-gray-900 dark:text-gray-100">{value}</dd>
        </div>
    );
};

const formatCurrency = (amount?: number): string => {
    if (amount === null || amount === undefined) return 'Price N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

const fetchNearbyPlacesSummary = async (lat: number, lng: number): Promise<string> => {
    await loadGoogleMapsApi();

    const g = (window as any).google;
    const placesService = new g.maps.places.PlacesService(document.createElement('div'));
    const location = new g.maps.LatLng(lat, lng);
    const placeTypes = ['school', 'hospital', 'transit_station', 'restaurant', 'shopping_mall', 'grocery_or_supermarket', 'park'];

    const searchPromises = placeTypes.map(type => 
        new Promise<{ type: string; count: number }>((resolve) => {
            placesService.nearbySearch({ location, radius: 5000, type, fields: ['business_status', 'name', 'place_id'] }, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === g.maps.places.PlacesServiceStatus.OK && results) {
                    const count = results.filter(p => p.business_status !== 'CLOSED_PERMANENTLY').length;
                    resolve({ type, count });
                } else {
                    resolve({ type, count: 0 });
                }
            });
        })
    );

    const results = await Promise.all(searchPromises);

    const summaryString = results
        .filter(result => result.count > 0)
        .map(result => `${result.count} ${result.type.replace(/_/g, ' ')}${result.count > 1 ? 's' : ''}`)
        .join(', ');

    return summaryString || 'No significant amenities were found in the immediate vicinity.';
};

interface PropertyModalProps {
    property: Property | null;
    onClose: () => void;
}

const PropertyModal: React.FC<PropertyModalProps> = ({ property, onClose }) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('details');
    const [routePolyline, setRoutePolyline] = useState<string | null>(null);
    
    // API Data State
    const [dataCache, setDataCache] = useState<Record<string, any>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});

    useEffect(() => {
        if (property) {
            document.body.classList.add('overflow-hidden');
            // Reset to details tab when a new property is selected
            if (activeTab !== 'details') {
                setActiveTab('details');
            }
        } else {
            document.body.classList.remove('overflow-hidden');
        }
        
        return () => {
            document.body.classList.remove('overflow-hidden');
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [property]);

    useEffect(() => {
        if (activeTab !== 'map') {
            setRoutePolyline(null);
        }
    }, [activeTab]);

    // FIX: Refactor helper functions with useCallback to stabilize them and fix parsing errors with generics.
    const getCacheKey = useCallback((type: string) => `${property?.ListingKey}-${type}`, [property]);

    const handleFetch = useCallback(async (type: 'analysis' | 'environmental', fetchFn: () => Promise<any>) => {
        if (!property) return;
        const cacheKey = getCacheKey(type);

        if (dataCache[cacheKey]) {
            return;
        }

        setLoadingStates(prev => ({ ...prev, [type]: true }));
        setErrorStates(prev => ({ ...prev, [type]: null }));

        try {
            const result = await fetchFn();
            setDataCache(prev => ({ ...prev, [cacheKey]: result }));
        } catch (err: any) {
            console.error(`Failed to fetch ${type}:`, err);
            setErrorStates(prev => ({ ...prev, [type]: err.message || `Failed to load ${type} data.` }));
        } finally {
            setLoadingStates(prev => ({ ...prev, [type]: false }));
        }
    }, [property, dataCache, getCacheKey]);

    useEffect(() => {
        const generateAnalysis = async () => {
            if (!property?.Latitude || !property?.Longitude) return;
            const amenitiesSummary = await fetchNearbyPlacesSummary(property.Latitude, property.Longitude);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                Analyze the location of this property for a potential buyer.
                Property Description: "${property.PublicRemarks}"
                Nearby Amenities Summary (within 5km): "${amenitiesSummary}"

                Provide a JSON object response according to the schema. The analysis should include:
                - An overview of the location.
                - A detailed analysis covering:
                    1. Location Quality: What makes this area attractive for living/working?
                    2. Amenity Density: How well-served is this location with essential services?
                    3. Lifestyle Factors: What type of lifestyle does this area support?
                    4. Notable Features: Any standout amenities or unique characteristics?
                    5. Recommendations: Who would benefit most from living/working here?
                - A final summary.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            overview: {
                                type: Type.STRING,
                                description: "A high-level overview of the property's location."
                            },
                            detailedAnalysis: {
                                type: Type.OBJECT,
                                properties: {
                                    locationQuality: {
                                        type: Type.STRING,
                                        description: "Answers: What makes this area attractive for living/working?"
                                    },
                                    amenityDensity: {
                                        type: Type.STRING,
                                        description: "Answers: How well-served is this location with essential services?"
                                    },
                                    lifestyleFactors: {
                                        type: Type.STRING,
                                        description: "Answers: What type of lifestyle does this area support?"
                                    },
                                    notableFeatures: {
                                        type: Type.STRING,
                                        description: "Answers: Any standout amenities or unique characteristics?"
                                    },
                                    recommendations: {
                                        type: Type.STRING,
                                        description: "Answers: Who would benefit most from living/working here?"
                                    }
                                },
                                required: ['locationQuality', 'amenityDensity', 'lifestyleFactors', 'notableFeatures', 'recommendations']
                            },
                            summary: {
                                type: Type.STRING,
                                description: "A final concluding summary of the location analysis."
                            }
                        },
                        required: ['overview', 'detailedAnalysis', 'summary']
                    }
                }
            });
            
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        };

        const getEnvironmentalData = async () => {
            if (!property?.Latitude || !property?.Longitude) return;
            const [air, solar, pollen] = await Promise.all([
                fetchAirQuality(property.Latitude, property.Longitude),
                fetchSolarPotential(property.Latitude, property.Longitude),
                fetchPollenInfo(property.Latitude, property.Longitude),
            ]);
            return { air, solar, pollen };
        };

        if (property) {
            if (activeTab === 'analysis') {
                handleFetch('analysis', generateAnalysis);
            } else if (activeTab === 'environmental') {
                handleFetch('environmental', getEnvironmentalData);
            }
        }
    }, [activeTab, property, handleFetch]);

    if (!property) return null;

    const price = formatCurrency(property.ListPrice);
    const address = property.UnparsedAddress || `${property.StreetNumber || ''} ${property.StreetName || ''}, ${property.City || 'City N/A'}`;
    const description = property.PublicRemarks || 'No detailed public description available.';
    const hasCoordinates = property.Latitude != null && property.Longitude != null;
    const hasSufficientAddress = !!property.UnparsedAddress && hasCoordinates;

    const hasSchools = property.ElementarySchool || property.MiddleOrJuniorSchool || property.HighSchool;
    const hasFeatures = (property.InteriorFeatures && property.InteriorFeatures.length > 0) || 
                        (property.ExteriorFeatures && property.ExteriorFeatures.length > 0) || 
                        (property.Appliances && property.Appliances.length > 0);

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-70 dark:bg-opacity-80" onClick={onClose}></div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl relative z-50 w-full max-w-6xl h-full max-h-[95vh] flex flex-col modal-scroll overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white z-50 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg transition">
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>
                
                <div className="p-4 sm:p-8">
                    <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-300 pr-12">{price}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{address}</p>
                    
                    <div className="border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-20 -mx-4 px-4 sm:-mx-8 sm:px-8">
                        <nav className="flex space-x-2 overflow-x-auto no-scrollbar">
                            <TabButton tabName="details" activeTab={activeTab} label="Overview" icon="fa-circle-info" onClick={setActiveTab} />
                            <TabButton tabName="gallery" activeTab={activeTab} label="Gallery & Street View" icon="fa-images" onClick={setActiveTab} disabled={!hasCoordinates} />
                            <TabButton tabName="map" activeTab={activeTab} label="Map & Commute" icon="fa-map-location-dot" onClick={setActiveTab} disabled={!hasCoordinates} />
                            <TabButton tabName="environmental" activeTab={activeTab} label="Environmental" icon="fa-leaf" onClick={setActiveTab} disabled={!hasCoordinates} />
                            <TabButton tabName="analysis" activeTab={activeTab} label="AI Analysis" icon="fa-microchip" onClick={setActiveTab} disabled={!hasSufficientAddress} />
                        </nav>
                    </div>

                    <div className="pt-6">
                        {activeTab === 'details' && (
                            <>
                                <h3 className="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Description</h3>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8 bg-blue-50 dark:bg-blue-900/50 p-4 rounded-lg">{description}</p>
                                
                                <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Property Details</h3>
                                <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 text-sm mb-8">
                                    <Feature label="Bedrooms" value={property.BedroomsTotal} />
                                    <Feature label="Bathrooms" value={property.BathroomsTotalInteger} />
                                    <Feature label="Square Footage" value={property.LivingArea ? `${property.LivingArea} sqft` : null} />
                                    <Feature label="Lot Size" value={property.LotSizeAcres ? `${property.LotSizeAcres.toFixed(2)} Acres` : null} />
                                    <Feature label="Year Built" value={property.YearBuilt} />
                                    <Feature label="Property Type" value={property.PropertyType} />
                                    <Feature label="Subdivision" value={property.SubdivisionName} />
                                </dl>
                                
                                {hasSchools && (
                                    <>
                                        <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Assigned Schools</h3>
                                        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm mb-8">
                                            <Feature label="Elementary School" value={property.ElementarySchool} />
                                            <Feature label="Middle School" value={property.MiddleOrJuniorSchool} />
                                            <Feature label="High School" value={property.HighSchool} />
                                        </dl>
                                    </>
                                )}

                                {hasFeatures && (
                                    <>
                                        <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Features & Amenities</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {property.InteriorFeatures && property.InteriorFeatures.length > 0 && (
                                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center"><i className="fa-solid fa-couch mr-2 text-blue-500"></i>Interior</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{property.InteriorFeatures.join(', ')}</p>
                                                </div>
                                            )}
                                            {property.ExteriorFeatures && property.ExteriorFeatures.length > 0 && (
                                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                                     <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center"><i className="fa-solid fa-house-chimney-window mr-2 text-blue-500"></i>Exterior</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{property.ExteriorFeatures.join(', ')}</p>
                                                </div>
                                            )}
                                             {property.Appliances && property.Appliances.length > 0 && (
                                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                                     <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center"><i className="fa-solid fa-blender-phone mr-2 text-blue-500"></i>Appliances</h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{property.Appliances.join(', ')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        
                        {activeTab === 'gallery' && hasCoordinates && <GalleryAndStreetView property={property} />}
                        
                        {activeTab === 'map' && hasCoordinates && (
                            <>
                               <MapComponent lat={property.Latitude!} lng={property.Longitude!} address={address} routePolyline={routePolyline} />
                               <CommuteCalculator origin={{ lat: property.Latitude!, lng: property.Longitude! }} onRouteCalculated={setRoutePolyline} />
                            </>
                        )}

                        {activeTab === 'environmental' && hasCoordinates && (
                            <EnvironmentalInsights
                                data={dataCache[getCacheKey('environmental')]}
                                isLoading={loadingStates['environmental']}
                                error={errorStates['environmental']}
                            />
                        )}

                        {activeTab === 'analysis' && hasSufficientAddress && (
                            <>
                                {loadingStates['analysis'] && (
                                    <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="loading-animation w-10 h-10 border-4 border-gray-200 dark:border-gray-600 border-solid rounded-full"></div>
                                        <p className="mt-4 text-gray-700 dark:text-gray-300 font-medium">Generating AI location analysis...</p>
                                    </div>
                                )}
                                {errorStates['analysis'] && <div className="p-4 text-center bg-red-50 text-red-700 rounded-lg">{errorStates['analysis']}</div>}
                                {dataCache[getCacheKey('analysis')] && <AILocationAnalysis analysis={dataCache[getCacheKey('analysis')]} />}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyModal;