/**
 * How the SSR bundle reaches the data layer.
 *
 * In production `WebServer.ts` runs the frontend's compiled SSR bundle inside
 * this very process, but the bundle is a separate module graph: importing
 * `./index.js` from it would give a *second* copy of those modules — a second
 * Sequelize pool, a second cache, and an empty `serversList`, since the live one
 * is only ever written by the collector's copy.
 *
 * So the running instance is published on globalThis and the bundle looks it up.
 * One value, no duplicate state, and no build-time coupling in either direction.
 */

import type * as ssrData from './index.js';

export type SsrData = typeof ssrData;

const KEY = '__mindustryStatsSsrData__';

type Holder = { [KEY]?: SsrData };

/** Called by the backend before it loads the SSR bundle. */
export function provideSsrData(data: SsrData): void {
  (globalThis as unknown as Holder)[KEY] = data;
}

/**
 * The in-process data layer, or undefined when there is none — which is the
 * normal case under `vite dev`, where SSR runs in the Vite process and the
 * backend is a separate one. Callers fall back to HTTP there.
 */
export function ssrDataLayer(): SsrData | undefined {
  return (globalThis as unknown as Holder)[KEY];
}
