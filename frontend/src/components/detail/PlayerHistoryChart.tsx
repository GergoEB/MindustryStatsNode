import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { ServerHistory } from "../../../../common/models/serverData.ts";
import { DateRangeOption } from "../../util/dateRangeConsts.ts";
import { createChartTooltip } from "../../util/chartTooltip.ts";
import { ChartLoadingFallback } from "../ChartSuspense.tsx";

interface PlayerHistoryChartProps {
  data: ServerHistory[];
  loading: boolean;
  selectedRange: DateRangeOption;
}

function formatTime(timestamp: number, range: DateRangeOption): string {
  const date = new Date(timestamp);
  if (range === "1d") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (range === "7d" || range === "14d") {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Single-series area chart used for both server and network player history.
// This is the uPlot rendering half of NetworkHistoryChart/ServerHistoryChart -
// it's a separate, lazily-loaded module so it never needs to run during SSR.
const PlayerHistoryChart = ({ data, loading, selectedRange }: PlayerHistoryChartProps) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const uplotRef = useRef<uPlot | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!outerRef.current || !mountRef.current || data.length === 0) return;

    uplotRef.current?.destroy();
    uplotRef.current = null;

    const xs = data.map((h) => h.timestamp / 1000);
    const ys = data.map((h) => h.players);

    const series: uPlot.Series[] = [
      { label: "Time" },
      {
        label: "Players",
        stroke: "rgb(249, 115, 22)",
        fill: "rgba(249, 115, 22, 0.1)",
        width: 2,
        spanGaps: false,
        points: { show: xs.length <= 80, size: 5 },
      },
    ];

    const tooltip = createChartTooltip(mountRef.current);

    function renderTooltip(u: uPlot, idx: number | null) {
      tooltip.update(u, idx, () => {
        if (idx == null) return null;
        const ts = (u.data[0] as number[])[idx];
        const title = new Date(ts * 1000).toLocaleString();
        const raw = (u.data[1] as (number | null)[])[idx];
        if (raw == null) return null;

        return {
          title,
          rows: [{ label: "Players", value: raw, color: "rgb(249, 115, 22)" }],
        };
      });
    }

    const opts: uPlot.Options = {
      width: outerRef.current.offsetWidth,
      height: outerRef.current.offsetHeight,
      series,
      axes: [
        {
          stroke: "#9ca3af",
          grid: { stroke: "rgba(249, 115, 22, 0.08)" },
          ticks: { stroke: "rgba(249, 115, 22, 0.08)" },
          values: (_u, splits) => splits.map((ts) => formatTime(ts * 1000, selectedRange)),
          size: 30,
          font: "10px sans-serif",
        },
        {
          stroke: "#9ca3af",
          grid: { stroke: "rgba(249, 115, 22, 0.08)" },
          ticks: { stroke: "rgba(249, 115, 22, 0.08)" },
          values: (_u, splits) => splits.map((v) => Math.round(v).toLocaleString()),
          size: 60,
          font: "10px sans-serif",
        },
      ],
      scales: {
        x: { time: true },
        y: { range: (_u, _min, max) => [0, Math.max(max * 1.05, 1)] },
      },
      legend: { show: false },
      cursor: {
        drag: { x: false, y: false },
      },
      hooks: {
        setCursor: [(u) => renderTooltip(u, u.cursor.idx ?? null)],
      },
    };

    uplotRef.current = new uPlot(opts, [xs, ys] as uPlot.AlignedData, mountRef.current);
    lastSizeRef.current = { width: opts.width, height: opts.height };

    const ro = new ResizeObserver((entries) => {
      if (!uplotRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width <= 0 || height <= 0) return;

      const last = lastSizeRef.current;
      if (Math.abs(width - last.width) < 1 && Math.abs(height - last.height) < 1) return;
      lastSizeRef.current = { width, height };

      requestAnimationFrame(() => {
        uplotRef.current?.setSize({ width, height });
      });
    });
    ro.observe(outerRef.current);

    return () => {
      ro.disconnect();
      tooltip.remove();
      uplotRef.current?.destroy();
      uplotRef.current = null;
    };
  }, [data, selectedRange]);

  return (
    <div className="w-full h-full relative">
      <div
        ref={outerRef}
        className={`absolute inset-0 block transition-opacity duration-300 ${
          loading ? "opacity-15 pointer-events-none" : "opacity-100"
        }`}
      >
        <div ref={mountRef} className="absolute inset-0 block overflow-hidden" />
      </div>

      {loading && <ChartLoadingFallback />}

      {!loading && data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-tertiary text-xs font-medium z-20">
          No data available for this range.
        </div>
      )}
    </div>
  );
};

export default PlayerHistoryChart;
