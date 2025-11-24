import React from 'react';
import type { Property } from '../types';
import ImageWithLoader from './ImageWithLoader';
import { useTheme } from '../contexts/ThemeContext';

const formatCurrency = (amount?: number): string => {
    if (amount === null || amount === undefined) return 'Price N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
};

interface PropertyCardProps {
    property: Property;
    onSelect: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect }) => {
    const { theme } = useTheme();
    
    const price = formatCurrency(property.ListPrice);
    const address = property.UnparsedAddress || `${property.StreetNumber || ''} ${property.StreetName || ''}, ${property.City || 'City N/A'}`;
    const bedrooms = property.BedroomsTotal || '?';
    const bathrooms = property.BathroomsTotalInteger || '?';
    const area = property.LivingArea || '?';
    
    const media = property.Media || [];
    const primaryImage = media.find(m => m && m.MediaURL);
    
    const placeholderSvgLight = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect fill="#F3F4F6" width="600" height="400"/><g fill="#D1D5DB"><path d="M150 125a25 25 0 1150 0 25 25 0 01-50 0z"/><path d="M125 300l75-75 50 50 125-150 125 150H125z"/></g></svg>')}`;
    const placeholderSvgDark = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect fill="#374151" width="600" height="400"/><g fill="#6B7280"><path d="M150 125a25 25 0 1150 0 25 25 0 01-50 0z"/><path d="M125 300l75-75 50 50 125-150 125 150H125z"/></g></svg>')}`;
    const placeholderSvg = theme === 'dark' ? placeholderSvgDark : placeholderSvgLight;
    
    const imageUrl = primaryImage?.MediaURL || placeholderSvg;

    return (
        <div 
            className="card-shadow bg-white dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer flex flex-col hover:border-blue-400 border border-transparent group"
            onClick={onSelect}
        >
            <ImageWithLoader
                src={imageUrl} 
                alt={address} 
                containerClassName="h-48"
                className="w-full h-full object-cover transition duration-500 ease-in-out group-hover:scale-105"
                fallbackSrc={placeholderSvg}
            />
            
            <div className="p-5 flex flex-col flex-grow">
                <h2 className="text-2xl font-extrabold text-blue-800 dark:text-blue-400 mb-1">{price}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 h-10 line-clamp-2">{address}</p>
                
                <div className="flex justify-between items-center text-sm mt-auto border-t pt-3 border-gray-200 dark:border-gray-700">
                    <span className="flex items-center text-gray-700 dark:text-gray-300">
                        <i className="fa-solid fa-bed mr-2 text-blue-500"></i> {bedrooms} Bd
                    </span>
                    <span className="flex items-center text-gray-700 dark:text-gray-300">
                        <i className="fa-solid fa-bath mr-2 text-blue-500"></i> {bathrooms} Ba
                    </span>
                    <span className="flex items-center text-gray-700 dark:text-gray-300">
                        <i className="fa-solid fa-ruler-combined mr-2 text-blue-500"></i> {area} sqft
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;