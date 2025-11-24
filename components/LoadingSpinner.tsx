import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex flex-col items-center py-20">
            <div className="loading-animation w-12 h-12 border-4 border-gray-200 dark:border-gray-600 border-solid rounded-full"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading properties...</p>
        </div>
    );
};

export default LoadingSpinner;
