import { useState } from "react";
import { ClientConfig } from "../../../common/models/ClientConfig";
import { getBaseUrl } from "../util/getApi";

export function useClientConfig() {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // SSR handles this, never fetched really
  const fetchConfig = async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/config`);
      if (!response.ok) throw new Error("Failed to fetch client config");

      const data: ClientConfig = await response.json();
      setConfig(data);
    } catch (err) {
      console.error("Error fetching client config:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Always fetch config on mount, but only once
  if (config === null) fetchConfig();

  return { config, loading, error };
}
