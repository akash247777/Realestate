
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import PropertyCard from './components/PropertyCard';
import PropertyModal from './components/PropertyModal';
import LoadingSpinner from './components/LoadingSpinner';
import { fetchProperties } from './services/realtyService';
import { searchProperties } from './services/searchService';
import type { Property } from './types';


const App: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchMessage, setSearchMessage] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);


    useEffect(() => {
        const loadApp = async () => {
            try {
                setError(null);
                setLoading(true);
                const data = await fetchProperties();
                setProperties(data);
                setFilteredProperties(data);
            } catch (err: any) {
                setError(`Failed to load application. ${err.message}`);
                console.error("Error loading app data:", err);
            } finally {
                setLoading(false);
            }
        };


        loadApp();
    }, []);


    const handleSelectProperty = (property: Property) => {
        setSelectedProperty(property);
    };


    const handleCloseModal = () => {
        setSelectedProperty(null);
    };

    const handleSearch = async (query: string) => {
        try {
            setIsSearching(true);
            setError(null);
            setSearchQuery(query);
            setSearchMessage('');

            const response = await searchProperties(query);

            if (response.success && response.results) {
                setFilteredProperties(response.results);
                setSearchMessage(response.message || `Found ${response.count} results`);
            } else {
                setError('No results found for your search.');
                setFilteredProperties([]);
                setSearchMessage('');
            }
        } catch (err: any) {
            setError(`Search failed: ${err.message}`);
            console.error('Search error:', err);
            setFilteredProperties([]);
            setSearchMessage('');
        } finally {
            setIsSearching(false);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setFilteredProperties(properties);
        setError(null);
        setSearchMessage('');
    };


    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <SearchBar
                    onSearch={handleSearch}
                    onClear={handleClearSearch}
                    isSearching={isSearching}
                    initialQuery={searchQuery}
                />

                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
                    <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-200">
                        {searchMessage || (searchQuery ? `Search Results for "${searchQuery}"` : 'Current Property Listings')}
                    </h2>
                </div>


                {loading && <LoadingSpinner />}

                {error && (
                    <div className="p-8 text-center bg-red-50 border border-red-300 text-red-700 rounded-lg">
                        <p className="font-bold">An Error Occurred</p>
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredProperties.length > 0 ? filteredProperties.map(property => (
                            <PropertyCard
                                key={property.ListingKey || property.ListingId}
                                property={property}
                                onSelect={() => handleSelectProperty(property)}
                            />
                        )) : (
                            <div className="col-span-full text-center text-gray-500 dark:text-gray-400 p-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <p className="text-lg font-semibold">No properties found.</p>
                            </div>
                        )}
                    </section>
                )}
            </main>


            <PropertyModal
                property={selectedProperty}
                onClose={handleCloseModal}
            />
        </div>
    );
};


export default App;