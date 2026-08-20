import { FetchStatus } from "./hooks/useApi.ts";

// Connection status helpers
export const getConnectionStatusClasses = (status: FetchStatus) => {
  switch (status) {
    case "success":
      return {
        dotColor: "bg-status-online",
        tooltip: "Connected",
      };
    case "loading":
      return {
        dotColor: "bg-yellow-400 animate-pulse",
        tooltip: "Reconnecting...",
      };
    default:
      return {
        dotColor: "bg-status-offline",
        tooltip: "Connection Error",
      };
  }
};
