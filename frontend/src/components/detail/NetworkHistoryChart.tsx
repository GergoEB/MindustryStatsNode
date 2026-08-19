import { useEffect, useRef } from "react";
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import {
  NetworkDetails,
  ServerHistory,
} from "../../../../common/models/serverData.ts";
import {
  DATE_RANGE_OPTIONS,
  DateRangeOption,
} from "../../util/dateRangeConsts.ts";
import { HistoryType, useHistory } from "../../hooks/useHistory.ts";

// Register Chart.js components
Chart.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

const NetworkHistoryChart = ({ network }: { network: NetworkDetails }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const {
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
  } = useHistory<ServerHistory>(network.id, HistoryType.Network);

  // Get today's date for max attribute on date inputs
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = chartData.map((h) => formatTime(h.timestamp, selectedRange));
    const data = chartData.map((h) => h.players);

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Players",
            data,
            borderColor: "rgb(249, 115, 22)",
            backgroundColor: "rgba(249, 115, 22, 0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: "rgb(249, 115, 22)",
            pointBorderColor: "rgb(249, 115, 22)",
            pointHoverBackgroundColor: "rgb(251, 146, 60)",
            pointHoverBorderColor: "rgb(251, 146, 60)",
            spanGaps: false, // Show gaps when data is null
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300,
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              font: { size: 11 },
              color: "rgba(255, 255, 255, 0.7)",
            },
            grid: {
              display: true,
              color: "rgba(249, 115, 22, 0.15)",
            },
          },
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
              font: { size: 10 },
              color: "rgba(255, 255, 255, 0.7)",
            },
            grid: {
              display: true,
              color: "rgba(249, 115, 22, 0.15)",
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            titleColor: "rgb(249, 115, 22)",
            bodyColor: "rgb(255, 255, 255)",
            borderColor: "rgb(249, 115, 22)",
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              title: (items) => {
                if (!items.length) return "";
                const item = items[0];
                const label = item.chart.data.labels?.[item.dataIndex];
                return label?.toString() || "";
              },
              label: (item) => `Players: ${item.formattedValue}`,
            },
          },
        },
        elements: {
          point: {
            radius: 0,
            hitRadius: 12,
            hoverRadius: 5,
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData, selectedRange]);

  const formatTime = (timestamp: number, range: DateRangeOption): string => {
    const date = new Date(timestamp);
    if (range === "1d") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (range === "7d" || range === "14d") {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Date Range Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedRange(option.value)}
            className={`px-3 py-1 text-sm ${
              selectedRange === option.value ? "button-accent" : "button-secondary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
  
      {/* Custom Date Range Inputs */}
      {selectedRange === "custom" && (
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="custom-start-date"
              className="text-sm text-tertiary"
            >
              From:
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={customStartDate}
              max={today}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-surface-tertiary border border-default rounded px-3 py-1 text-sm text-primary focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="custom-end-date" className="text-sm text-tertiary">
              To:
            </label>
            <input
              id="custom-end-date"
              type="date"
              value={customEndDate}
              max={today}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-surface-tertiary border border-default rounded px-3 py-1 text-sm text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}
  
      {/* Date Range Error */}
      {dateError && (
        <div className="text-status-offline text-sm mb-4">{dateError}</div>
      )}
  
      {/* Fetch Error */}
      {fetchError && (
        <div className="text-status-offline text-sm mb-4 bg-status-offline border border-status-offline rounded p-3">
          {fetchError}
        </div>
      )}
  
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded h-6 w-6 border-2 border-accent border-t-transparent"></div>
          <span className="ml-2 text-tertiary text-sm">Loading history...</span>
        </div>
      )}
  
      {/* Chart */}
      <div className="flex-1 min-h-0">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default NetworkHistoryChart;
