# Frontend

React + TanStack Start (Router + SSR), Vite 8, Tailwind 4, uPlot. Built by Vite into
two halves that the backend serves:

- `dist/client/` → static assets, served by Elysia's static plugin from `public/client`
- `dist/server/server.js` → the SSR handler, which `backend/src/api/WebServer.ts`
  imports at startup and calls for every non-`/api` request

So in production **there is one process**: the Bun/Elysia backend runs the SSR bundle
itself. That is what lets route loaders skip HTTP entirely (see below).

## Running it locally

Two processes, two terminals:

```bash
# terminal 1 — API + collectors, on :3000
cd backend && bun run dev

# terminal 2 — Vite dev server + SSR, on :4000
cd frontend && bun run dev
```

Then browse **http://localhost:4000**. Vite proxies `/api` and `/config` through to
:3000 (`vite.config.ts`), so the backend needs no knowledge of the frontend at all.

`vite dev` *is* the SSR server in dev — the `tanstackStart()` plugin runs
`entry-server.tsx`, executes route loaders server-side, and serves the `/_serverFn/*`
endpoints, all with HMR and Fast Refresh. You do not need to build the frontend, copy
it anywhere, or have the backend load it.

### Checking the production shape

When you want to exercise the real single-process layout — the one where loaders call
the backend in-process — build and run it the way production does:

```bash
cd frontend && bun run build-move-dev   # builds, then copies dist/* into backend/public
cd ../backend && bun run dev            # cwd must be backend/, it resolves public/ from cwd
```

Now everything is on **http://localhost:3000** and the SSR bundle is running inside the
backend process. Worth doing before a release; not worth doing on every edit.

## Where the data comes from

`src/server/loaders.ts` holds the route loaders' data sources as TanStack Start server
functions. Each one prefers the backend's data layer, published on `globalThis` by
`WebServer.ts` before it loads the SSR bundle (`backend/src/api/data/registry.ts`):

- **Production** — the lookup succeeds, so the loader calls `backend/src/api/data/*`
  directly. No socket, no JSON encode/decode, and it shares the same in-memory caches
  and the same live `serversList` the HTTP routes read.
- **`vite dev`** — SSR runs in the Vite process, which is not the process holding that
  state, so the lookup returns `undefined` and the loader falls back to the HTTP API.

Same data and same shapes either way, because the HTTP route and the loader call the
*same* data-layer function; dev just reaches it one hop further away.

Anything the client refetches after hydration — `useApi`'s poll, the history hooks,
`useClientConfig` — stays on `fetch`, in both environments. The browser has no other
way to ask.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server on :4000, HMR, SSR |
| `bun run build` | `tsc -b` then `vite build` → `dist/client` + `dist/server` |
| `bun run build-move-dev` | `build`, then copy `dist/*` into `../backend/public` |
| `bun run lint` | ESLint |

`bun run build` needs `common/version_build.ts` to exist. It is gitignored and written
by the root `build.sh`; for a local build any stub with the three `BUILD_*` exports does.
