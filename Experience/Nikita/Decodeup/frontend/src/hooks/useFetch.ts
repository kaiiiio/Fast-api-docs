import { useState, useCallback } from 'react';

interface FetchOptions extends RequestInit {
    body?: any;
}

export const useFetch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const request = useCallback(async (url: string, options: FetchOptions = {}) => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            };

            const response = await fetch(url, {
                ...options,
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { request, loading, error };
};
