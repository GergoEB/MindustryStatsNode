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
- ApiService.ts - Handles API requests, and sends data to frontend

The server related services, pass data between eachother:
ServerCollectorService does collections daily, but every few minutes it requeues all servers, ServerDiscoveryService pings them, and places responses into a queue for ServerProcessorService to process and insert into database in efficient batches.

## Frontend
Tanstack Start Router is used for routing and SSR.
To get data hooks are used, they do not include types yet via Elysia, so they are thrown about inside `common/models`.
uPlot is used for graphs, Chart.js too, but moving away from it. For tooltips use `frontend/src/util/chartTooltip.ts` and a useful helper is at `frontend/src/util/chartHelpers.ts`.

## Notable Design Decisions

The app is a monorepo, for simplicity.
The app does not use any dedicated caching layer, so it happens within the app itself.
The goal is efficiency, but not when it takes crazy amount of work.

The backend often passes data through ApiPacker, which takes arrays of objects and packs them into a 2D array representing it. Nested objects are not flattened. Source is at `common/Packer.ts` which includes both packer and unpacker.

# FYI

Do not attempt to read `backend/migrations` or especially `backend/migrations_legacy` (legacy means run manually, DB is out of sync with these). Latest schema is included in `schema.sql` at the root of the project. If you want to make changes, do it in `backend/migrations`. You can add "--no-tran" on first line for migrations if they need manual running (like certain CALL statements relating to TimescaleDB).