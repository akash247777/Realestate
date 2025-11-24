import React, { useState } from 'react';
import type { Property } from '../types';
import ImageWithLoader from './ImageWithLoader';
import { getStreetViewImageUrl } from '../services/googleApiService';
import { useTheme } from '../contexts/ThemeContext';

interface GalleryAndStreetViewProps {
    property: Property;
}

const GalleryAndStreetView: React.FC<GalleryAndStreetViewProps> = ({ property }) => {
    const { theme } = useTheme();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const media = property.Media || [];
    
    const placeholderSvgLight = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect fill="#F3F4F6" width="1200" height="800"/><g fill="#D1D5DB" transform="scale(2)"><path d="M150 125a25 25 0 1150 0 25 25 0 01-50 0z"/><path d="M125 300l75-75 50 50 125-150 125 150H125z"/></g></svg>')}`;
    const placeholderSvgDark = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect fill="#374151" width="1200" height="800"/><g fill="#6B7280" transform="scale(2)"><path d="M150 125a25 25 0 1150 0 25 25 0 01-50 0z"/><path d="M125 300l75-75 50 50 125-150 125 150H125z"/></g></svg>')}`;
    const placeholderSvg = theme === 'dark' ? placeholderSvgDark : placeholderSvgLight;

    const safeIndex = currentImageIndex >= media.length ? 0 : currentImageIndex;
    const currentMediaItem = media[safeIndex];
    const mainImageUrl = (currentMediaItem && currentMediaItem.MediaURL) ? currentMediaItem.MediaURL : placeholderSvg;
    const streetViewUrl = getStreetViewImageUrl(property.Latitude!, property.Longitude!);
    
    const handleNextImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % media.length);
    };

    const handlePrevImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex - 1 + media.length) % media.length);
    };

    return (
        <div>
            <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Photo Gallery</h3>
            <div className="relative group mb-8">
                <ImageWithLoader
                    key={`${property.ListingKey}-${safeIndex}`}
                    src={mainImageUrl}
                    alt={`Property image ${safeIndex + 1}`}
                    containerClassName="h-[500px] rounded-xl shadow-lg"
                    className="w-full h-full object-cover"
                    fallbackSrc={placeholderSvg}
                />
                {media.length > 1 && (
                    <>
                        <button onClick={handlePrevImage} className="absolute top-1/2 left-4 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-60 transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-10" aria-label="Previous Image">
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <button onClick={handleNextImage} className="absolute top-1/2 right-4 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-60 transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-10" aria-label="Next Image">
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            {safeIndex + 1} / {media.length}
                        </div>
                    </>
                )}
            </div>
            
            <h3 className="text-2xl font-semibold my-4 text-gray-800 dark:text-gray-200 border-l-4 border-blue-500 pl-3">Street View</h3>
            <ImageWithLoader
                src={streetViewUrl}
                alt="Street View of the property"
                containerClassName="h-96 rounded-xl shadow-lg"
                className="w-full h-full object-cover"
                fallbackSrc={placeholderSvg}
            />
        </div>
    );
};

export default GalleryAndStreetView;
