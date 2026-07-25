import { useState, useEffect } from "react";
import { ApiPacker } from "../../../common/Packer";
import { DateRangeOption } from "../util/dateRangeConsts";

export enum HistoryType {
  Network = "network",
  Server = "server"
}

function getEndpointBaseUrl(id: number | string, type: HistoryType): string {
  switch (type) {
    case HistoryType.Network:
      return `/api/networks/${id}/history`;
    case HistoryType.Server:
      return `/api/servers/${id}/history`;
    default:
      throw new Error(`Unknown history type: ${type}`);
  }
}

export function useHistory<T>(id: number | string, type: HistoryType) {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>("1d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [chartData, setChartData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const endpointBaseUrl = getEndpointBaseUrl(id, type);

  useEffect(() => {
    // 1. Date range validation
    if (selectedRange === "custom") {
      if (!customStartDate || !customEndDate) {
        setDateError(null);
        return;
      }

      const startTs = new Date(customStartDate).getTime();
      const endTs = new Date(customEndDate).getTime();

      if (endTs <= startTs) {
        setDateError("End date must be after start date");
        return;
      }
      setDateError(null);
    }

    // 2. Fetch history
    const fetchHistoryData = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        let url = `${endpointBaseUrl}?range=${selectedRange}`;

        if (selectedRange === "custom" && customStartDate && customEndDate) {
          const startTs = new Date(customStartDate).getTime();
          const endTs = new Date(customEndDate).getTime();
          url = `${endpointBaseUrl}?startDate=${startTs}&endDate=${endTs}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Status ${response.status}: ${response.statusText}`);
        }

        const data = ApiPacker.unpack<T>(await response.json());
        setChartData(data);
      } catch (error) {
        console.error("Error fetching history data:", error);
        setFetchError("Unable to load history data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [selectedRange, customStartDate, customEndDate, endpointBaseUrl]);

  return {
    chartData,
    loading,
    fetchError,
    dateError,
    selectedRange,
    setSelectedRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  };
}