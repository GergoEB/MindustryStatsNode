import { useState, useEffect } from "react";
import { ServerHistory } from "../../../common/models/serverData";
import { ApiPacker } from "../../../common/Packer";

export type DateRangeOption = "1d" | "7d" | "14d" | "3m" | "12m" | "custom";

export interface DateRange {
  label: string;
  value: DateRangeOption;
  hours?: number;
}

export const DATE_RANGE_OPTIONS: DateRange[] = [
  { label: "1 Day", value: "1d", hours: 24 },
  { label: "7 Days", value: "7d", hours: 168 },
  { label: "14 Days", value: "14d", hours: 336 },
  { label: "3 Months", value: "3m", hours: 2190 },
  { label: "12 Months", value: "12m", hours: 8760 },
  { label: "Custom", value: "custom" },
];

export function useServerHistory(serverId: string | number) {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>("1d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [chartData, setChartData] = useState<ServerHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Validate custom range before fetching
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

    // 2. Fetch history data
    const fetchHistoryData = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        let url = `/api/servers/${serverId}/history?range=${selectedRange}`;

        if (selectedRange === "custom" && customStartDate && customEndDate) {
          const startTs = new Date(customStartDate).getTime();
          const endTs = new Date(customEndDate).getTime();
          url = `/api/servers/${serverId}/history?startDate=${startTs}&endDate=${endTs}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Status ${response.status}: ${response.statusText}`);
        }

        const data: ServerHistory[] = ApiPacker.unpack(await response.json());
        setChartData(data);
      } catch (error) {
        console.error("Error fetching history data:", error);
        setFetchError("Unable to load server history data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [selectedRange, customStartDate, customEndDate, serverId]);

  return {
    // Data & state
    chartData,
    loading,
    fetchError,
    dateError,
    // Controls for the UI inputs
    selectedRange,
    setSelectedRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  };
}