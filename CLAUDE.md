# Mindustry Tracker

This is a mindustry tracker for tracking Mindustry servers.
It uses Bun as runtime, does not make use of native executables (due to pg not including properly), and uses TimescaleDB for database.

`common` is for types and utilities shared between the backend and frontend.
`backend` is for the backend server that handles the tracking and data storage.
`frontend` is for the frontend web application that displays the tracked data.

## Notable Files / Folders
All connections to database: `backend/src/repositories/*`



## Libraries
### Backend
For database, use Sequelize with PostgreSQL.
Bun is used, so Elysia is being used as webserver.

Services are inside `backend/src/services`, they simulate microservices, but are not separate processes.
Inside is:
- ServerCollectorService.ts - Parses public server lists, and inserts them to database
- ServerDiscoveryService.ts - Queries the database for servers, and sends a ping to them
- ServerProcessorService.ts - Processes server data, and inserts it to database
- mindustryService.ts - Sends Mindustry Packets and waits for response

The HTTP layer lives in `backend/src/api` instead, and is not a service:
- `WebServer.ts` - transport: rate limit tiers, CORS, static assets, the API, and the TanStack SSR catch-all. `startWebServer()` / `stopWebServer()`.
- `app.ts` - the Elysia app itself (routes + error handling). Exports `api` and `type Api`; the frontend consumes that type via Eden Treaty in `frontend/src/util/api.ts`, so it must stay a chained expression rather than a class.
- `routes/*.ts` - one chained Elysia instance per group.
- `data/*.ts` - the endpoints' actual work, minus transport. See "Route loaders" below. Anything a route loader needs belongs here, not inline in the route.
- `middleware/cache.ts`, `middleware/rateLimit.ts` - spread into a route's hook options (`...withCache({...})`). Do NOT pass them as `use: [...]`, Elysia 1.4 silently ignores beforeHandle/afterHandle supplied that way.

The live server snapshot shared between the processor and the API is `backend/src/state/serversList.ts`.

The server related services, pass data between eachother:
ServerCollectorService does collections daily, but every few minutes it requeues all servers, ServerDiscoveryService pings them, and places responses into a queue for ServerProcessorService to process and insert into database in efficient batches.

## Frontend
Tanstack Start Router is used for routing and SSR.
To get data hooks are used. A typed Eden Treaty client is available at `frontend/src/util/api.ts`; the existing hooks still hand-fetch against `common/models` types and can be migrated onto it incrementally.
uPlot is used for graphs, Chart.js too, but moving away from it. For tooltips use `frontend/src/util/chartTooltip.ts` and a useful helper is at `frontend/src/util/chartHelpers.ts`.

`frontend/README.md` has the dev loop (two processes: backend on :3000, `vite dev` on :4000) and how to run the production single-process shape locally.

### Route loaders
Loaders in `frontend/src/routes/*` do NOT fetch over HTTP. They call server functions in `frontend/src/server/loaders.ts`, which read the backend's data layer in-process.

This works because production is one process: `WebServer.ts` imports the frontend's compiled SSR bundle (`public/server/server.js`) and serves every non-`/api` request with it. The bundle is a separate module graph though, so importing `api/data/*` from the frontend would give a *second* copy — a second Sequelize pool, a second cache, and an empty `serversList`, since only the collector's copy is ever written. Instead `WebServer.ts` publishes the live instance on globalThis via `api/data/registry.ts` and the bundle looks it up. Under `vite dev` SSR runs in the Vite process, the lookup misses, and the server functions fall back to HTTP.

Consequences to keep in mind when touching this:
- Endpoints a loader uses must be cached in `api/data/*` (via `data/cache.ts`), not with `withCache` on the route — a direct call never reaches an Elysia hook. Do not do both, you would get two caches.
- Rate limiting is likewise transport-only, so direct calls are unmetered. No regression: loopback was already exempt, and the `page` tier still meters the SSR renders themselves.
- Return values unpacked, and let the route do `ApiPacker.pack`. Packing is a wire-format concern. The exception is the server list, big enough that keeping it packed shrinks the SSR payload it gets inlined into.
- Only the first, server-rendered load goes through a loader. Client refetches (`useApi`'s poll, the history hooks, `useClientConfig`) still use `fetch` and still need their HTTP routes.

## Notable Design Decisions

The app is a monorepo, for simplicity.
The app does not use any dedicated caching layer, so it happens within the app itself.
The goal is efficiency, but not when it takes crazy amount of work.

The backend often passes data through ApiPacker, which takes arrays of objects and packs them into a 2D array representing it. Nested objects are not flattened. Source is at `common/Packer.ts` which includes both packer and unpacker.

# FYI

Do not attempt to read `backend/migrations` or especially `backend/migrations_legacy` (legacy means run manually, DB is out of sync with these). Latest schema is included in `schema.sql` at the root of the project. If you want to make changes, do it in `backend/migrations`. You can add "--no-tran" on first line for migrations if they need manual running (like certain CALL statements relating to TimescaleDB).