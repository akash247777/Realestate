import React, { useState } from 'react';

interface SearchBarProps {
    onSearch: (query: string) => void;
    onClear: () => void;
    isSearching: boolean;
    initialQuery: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onClear, isSearching, initialQuery }) => {
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };
    
    const handleClear = () => {
        setQuery('');
        onClear();
    };
    
    // Sync local state if parent's query changes (e.g., on clear)
    React.useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    return (
        <section className="mb-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-grow w-full">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., 'Show me properties with a pool and 3 bedrooms'"
                        className="w-full p-4 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        aria-label="Search for properties"
                    />
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        type="submit"
                        disabled={isSearching || !query.trim()}
                        className="flex-grow sm:flex-grow-0 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition flex items-center justify-center w-full sm:w-auto"
                    >
                        {isSearching ? <i className="fa-solid fa-spinner fa-spin"></i> : "Search"}
                    </button>
                    {initialQuery && (
                         <button
                            type="button"
                            onClick={handleClear}
                            disabled={isSearching}
                            className="flex-grow sm:flex-grow-0 bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </form>
        </section>
    );
};

export default SearchBar;