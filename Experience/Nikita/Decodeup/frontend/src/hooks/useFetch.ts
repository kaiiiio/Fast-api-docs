import { useState, useCallback } from 'react';

/**
 * Custom Fetch Hook for React.
 * Handles loading states, error reporting, and automatic JWT token injection.
 * As requested, this replaces external libraries like RTK Query for simple data fetching.
 */
interface FetchOptions extends RequestInit {
    body?: any;
}

export const useFetch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Universal request function to handle API calls.
     * useCallback ensures the reference is stable and doesn't trigger unnecessary re-renders.
     */
    const request = useCallback(async (url: string, options: FetchOptions = {}) => {
        setLoading(true);
        setError(null);

        try {
            // Retrieve the JWT token from localStorage (if it exists)
            const token = localStorage.getItem('token');

            const headers = {
                'Content-Type': 'application/json',
                // Inject Authorization header if a token is present
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            };

            const response = await fetch(url, {
                ...options,
                headers,
                // Stringify body if present (simplifies calls from components)
                body: options.body ? JSON.stringify(options.body) : undefined,
            });

            const data = await response.json();

            // Fetch doesn't throw on 4xx/5xx errors, so we handle it manually
            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            // Ensure loading is set to false regardless of success or failure
            setLoading(false);
        }
    }, []);

    return { request, loading, error };
};
