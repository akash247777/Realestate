import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-500 tracking-tight">
                    Realty<span className="text-blue-400 dark:text-blue-300">Feed</span> Explorer
                </h1>
                <div className="flex items-center space-x-6">
                    <nav className="hidden md:flex space-x-6 text-gray-600 dark:text-gray-300 font-medium">
                        <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Listings</a>
                        <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition">About</a>
                        <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition">Contact</a>
                    </nav>
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        aria-label="Toggle dark mode"
                    >
                        {theme === 'light' ? (
                            <i className="fa-solid fa-moon text-lg"></i>
                        ) : (
                            <i className="fa-solid fa-sun text-lg text-yellow-400"></i>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
