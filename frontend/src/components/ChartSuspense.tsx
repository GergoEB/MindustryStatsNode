import { Suspense, type ReactNode } from "react";
import {LoadingSpinner} from "./LoadingSpinner.tsx";


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
  <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
);
