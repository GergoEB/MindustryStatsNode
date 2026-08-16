import { useState, useEffect } from "react";
import { ServerDetails, ServerElement } from "../../../common/models/serverData";
import { getBaseUrl } from "../util/getApi";

export function useServerDetails(serverId: string | number, initialDetails?: (ServerElement & ServerDetails) | null) {
  const [details, setDetails] = useState<(ServerElement & ServerDetails) | null>(initialDetails ?? null);
  const [loading, setLoading] = useState<boolean>(!initialDetails);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip fetch if we already have initial details from SSR
    if (initialDetails) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchDetails = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/servers/${serverId}/details`);
        if (!response.ok) throw new Error("Failed to fetch server details");

        const data: ServerElement & ServerDetails = await response.json();
        setDetails(data);
      } catch (err) {
        console.error("Error fetching server details:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [serverId, initialDetails]); // Include initialDetails in dependency array

  return { details, loading, error };
}
