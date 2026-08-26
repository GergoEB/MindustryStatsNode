import { Suspense, type ReactNode } from "react";

/**
 * Standard "chart is loading" overlay — a small square spinner + label.
 * Exported on its own so it can double as the fallback for Suspense *and*
 * as an inline loading overlay inside a chart component itself (see
 * `PlayerHistoryChart.tsx` for the latter).
 */
export const ChartLoadingFallback = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-primary/50 z-20">
    <div className="animate-spin rounded h-6 w-6 border-2 border-accent border-t-transparent" />
    <span className="text-xs text-secondary font-medium tracking-wide animate-pulse">
      Loading...
    </span>
  </div>
);

/**
 * Wraps a client-only chart in a Suspense boundary so it never gets pulled
 * into the SSR render. uPlot (and libraries like it) poke at the DOM/canvas
 * in ways that blow up on the server unless you install extra native deps
 * there - easiest fix is to just never import the chart module server-side.
 *
 * Pair this with `React.lazy` so the chart's module is only fetched once
 * we're actually running in the browser:
 *
 *   import { lazy } from "react";
 *   import { ChartSuspense } from "../ChartSuspense.tsx";
 *
 *   const MyChart = lazy(() => import("./MyChart.tsx"));
 *
 *   <div className="relative h-64">
 *     <ChartSuspense>
 *       <MyChart {...props} />
 *     </ChartSuspense>
 *   </div>
 *
 * Note the wrapping element needs `position: relative` (or similar), since
 * the fallback (and most uPlot chart components) position themselves
 * absolutely to fill it.
 */
export const ChartSuspense = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<ChartLoadingFallback />}>{children}</Suspense>
);
