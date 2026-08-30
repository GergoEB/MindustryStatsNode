import { useEffect, useState } from 'react';
import { ServerElement } from '../../../common/models/serverData.ts';
import { ApiPacker } from '../../../common/Packer.ts';
import { useClientConfig } from './useClientConfig.ts';

/**
 * Client-side hook that keeps polling `/api/servers` every 10s to stay in
 * sync with the cached backend. `initialData` (typically sourced from the
 * route loader via `server/loaders.ts`) can be passed in to avoid a loading
 * flash on first paint after SSR hydration.
 */
const useApi = (initialData: ServerElement[] | null = null) => {
    const [data, setData] = useState<ServerElement[] | null>(initialData);
    const [error, setError] = useState<Error | null>(null);
    const { config: clientConfig, loading: isConfigLoading, error: configError } = useClientConfig();
  
    useEffect(() => {
        // This is a React safety flag. It prevents React from trying to update
        // the state if the user navigates away from the page before the fetch finishes.
        let isMounted = true;

        if (isConfigLoading) {
            return;
        }
        if (configError) {
            setError(configError);
            return;
        }
        if (!clientConfig) {
            setError(new Error('No config'));
            return;
        }


        const fetchServerStats = async () => {
            try {
                // Fetch from your cached HTTP endpoint
                const response = await fetch('/api/servers');

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const jsonData = ApiPacker.unpack<ServerElement>(await response.json());

                if (isMounted) {
                    setData(jsonData);
                    setError(null); // Clear any previous errors
                }
            } catch (err) {
                console.error('Error fetching server stats:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                }
            }
        };

        // 1. Fetch immediately when the component loads (skip if we already
        // have SSR-provided initialData, still poll afterwards regardless).
        if (!initialData) {
            fetchServerStats().then(() => {});
        }

        // 2. Poll at configured increments
        const pollInterval = setInterval(fetchServerStats, clientConfig.refreshInterval);

        // 3. Cleanup function: React runs this when the component unmounts/is destroyed
        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // The empty array ensures this setup only runs once when mounted

    return { data, error };
};

export default useApi;
