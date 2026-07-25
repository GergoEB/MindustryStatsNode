import { useState, useEffect } from 'react';
import { NetworkDetails } from '../../../common/models/serverData';

export function useNetworkDetail(networkId: string | number) {
  const [details, setDetails] = useState<NetworkDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when networkId changes
    setLoading(true);
    setError(null);

    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/networks/${networkId}/details`);
        if (!response.ok) throw new Error('Failed to fetch network details');
        
        const data: NetworkDetails = await response.json();
        setDetails(data);
      } catch (err) {
        console.error('Error fetching network details:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [networkId]);

  return { details, loading, error };
}