/**
 * Search Service
 * Handles communication with the backend API for natural language search
 */

/// <reference types="vite/client" />

// When deployed to Vercel, the API is served from the same domain
// When running locally, we use the separate backend server
const IS_VERCEL = import.meta.env.VITE_VERCEL === 'true';
const API_BASE_URL = IS_VERCEL ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');

export interface SearchResponse {
    success: boolean;
    query: string;
    sql: string;
    results: any[];
    count: number;
    message?: string;
    error?: string;
}

/**
 * Search properties using natural language query
 * @param query - Natural language search query
 * @returns Promise with search results
 */
export async function searchProperties(query: string): Promise<SearchResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Search request failed');
        }

        return data;
    } catch (error) {
        console.error('Search error:', error);
        throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Check if the backend API is healthy
 * @returns Promise with health status
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return await response.json();
    } catch (error) {
        console.error('Health check error:', error);
        throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
