/// <reference types="vite/client" />

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface SearchResponse {
    success: boolean;
    query: string;
    results: any[];
    count: number;
    message?: string;
    error?: string;
}

export async function searchProperties(query: string): Promise<SearchResponse> {
    try {
        if (!query.trim()) {
            return {
                success: false,
                query,
                results: [],
                count: 0,
                error: 'Query cannot be empty',
            };
        }

        const apiUrl = `${supabaseUrl}/functions/v1/search-properties`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${anonKey}`,
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

export async function checkHealth(): Promise<{ status: string; service: string }> {
    try {
        const apiUrl = `${supabaseUrl}/functions/v1/search-properties`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: 'show me all properties' }),
        });

        if (response.ok) {
            return {
                status: 'healthy',
                service: 'Real Estate Search (Cloud SQL)',
            };
        }

        throw new Error('Health check failed');
    } catch (error) {
        console.error('Health check error:', error);
        throw new Error('Health check failed');
    }
}
