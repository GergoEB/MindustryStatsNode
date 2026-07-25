import { useState, useEffect, useCallback } from 'react';
import { InactiveServerInfo } from '../../../common/models/RepositoryTypes';
import { ServerListStats } from '../../../common/models/serverData';
import { ApiPacker } from '../../../common/Packer';

interface UseInactiveServersDataResult {
  inactiveServers: InactiveServerInfo[];
  stats: ServerListStats[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInactiveServersData(): UseInactiveServersDataResult {
  const [inactiveServers, setInactiveServers] = useState<InactiveServerInfo[]>([]);
  const [stats, setStats] = useState<ServerListStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [serversRes, statsRes] = await Promise.all([
        fetch(`api/inactive-servers`),
        fetch(`api/serverlist-stats`),
      ]);

      if (!serversRes.ok) throw new Error('Failed to fetch inactive servers');
      if (!statsRes.ok) throw new Error('Failed to fetch server list stats');

      const [serversRaw, statsRaw] = await Promise.all([
        serversRes.json(),
        statsRes.json(),
      ]);

      const serversData: InactiveServerInfo[] = ApiPacker.unpack(serversRaw);
      const statsData: ServerListStats[] = ApiPacker.unpack(statsRaw);

      setInactiveServers(serversData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching inactive servers data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { inactiveServers, stats, loading, error, refetch: fetchData };
}