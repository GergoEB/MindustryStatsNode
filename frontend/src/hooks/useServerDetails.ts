import { useState, useEffect } from "react";
import { ServerDetails } from "../../../common/models/serverData";

export function useServerDetails(serverId: string | number) {
  const [details, setDetails] = useState<ServerDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/servers/${serverId}/details`);
        if (!response.ok) throw new Error("Failed to fetch server details");

        const data: ServerDetails = await response.json();
        setDetails(data);
      } catch (err) {
        console.error("Error fetching server details:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [serverId]); // Pass serverId instead of full object reference

  return { details, loading, error };
}
