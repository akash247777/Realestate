import React, { useState } from 'react';

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    containerClassName?: string;
    fallbackSrc?: string;
}

const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({ 
    src, 
    alt, 
    className, 
    containerClassName, 
    fallbackSrc = 'https://picsum.photos/800/600?grayscale', 
    ...props 
}) => {
    const [loaded, setLoaded] = useState(false);

    const handleLoad = () => {
        setLoaded(true);
    };
    
    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = fallbackSrc;
        setLoaded(true); // show the fallback
    };
    
    return (
        <div className={`relative bg-gray-200 dark:bg-gray-700 overflow-hidden ${containerClassName}`}>
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-spinner fa-spin text-gray-400 dark:text-gray-500 text-3xl"></i>
                </div>
            )}
            <img 
                {...props}
                src={src} 
                alt={alt}
                loading="lazy"
                onLoad={handleLoad}
                onError={handleError}
                className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};

export default ImageWithLoader;
