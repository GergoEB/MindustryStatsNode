/**
 * Route-loader data sources.
 *
 * In production the SSR bundle is loaded by the Bun/Elysia process itself
 * (backend/src/api/WebServer.ts imports public/server/server.js), so these
 * handlers can read the backend's data layer straight off globalThis: no socket,
 * no JSON encode/decode, and the same in-memory caches the HTTP routes hit.
 *
 * Under `vite dev` the SSR runs in the Vite process instead, which is not the
 * process holding the live server list, so there we fall back to the HTTP API.
 * Same functions producing the data either way, one hop further away — see
 * `frontend/README.md` for how to run it.
 *
 * Only the first, server-rendered load comes through here. Everything the client
 * refetches after hydration (`useApi`'s poll, the history hooks) still goes over
 * HTTP, because the browser has no other way to ask.
 */

import { createServerFn } from '@tanstack/react-start';
import { ssrDataLayer } from '../../../backend/src/api/data/registry.ts';
import { ApiPacker, type ApiResponsePacket } from '../../../common/Packer.ts';
import type { GamemodeInfo } from '../../../common/models/GlobalStatsTypes.ts';
import type { NetworkDetails, ServerDetails, ServerElement } from '../../../common/models/serverData.ts';
import { getBaseUrl } from '../util/getApi.ts';

/**
 * `/_serverFn/*` is as public as `/api` is, and it has no Elysia schema in front
 * of it, so the ids these take are checked here — the equivalent of the routes'
 * `t.Numeric()`. Without it a junk id reaches the query and, worse, becomes a
 * cache key.
 */
function serverSideId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 0) throw new Error(`Invalid id: ${String(value)}`);
  return id;
}

/** Dev-only path: the same endpoints, over loopback. */
async function viaHttp<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

/** As above, for the by-id endpoints, where a 404 is a real answer and not a fault. */
async function viaHttpOptional<T>(path: string): Promise<T | undefined> {
  const response = await fetch(`${getBaseUrl()}${path}`);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

/**
 * The sidebar's server list, kept packed: it is the one payload big enough that
 * inlining ~700 objects' worth of repeated keys into the HTML would cost more
 * than unpacking them costs on the client.
 */
export const fetchServers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiResponsePacket> => {
    const data = ssrDataLayer();
    if (data) return data.getServerListPacked();

    return viaHttp<ApiResponsePacket>('/api/servers');
  },
);

export const fetchGamemodes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GamemodeInfo[]> => {
    const data = ssrDataLayer();
    if (data) return data.getGamemodes();

    return ApiPacker.unpack<GamemodeInfo>(await viaHttp<ApiResponsePacket>('/api/gamemodes'));
  },
);

export const fetchServerDetails = createServerFn({ method: 'GET' })
  .validator(serverSideId)
  .handler(async ({ data: serverId }): Promise<(ServerElement & ServerDetails) | undefined> => {
    const data = ssrDataLayer();
    if (data) return data.getServerDetails(serverId);

    return viaHttpOptional<ServerElement & ServerDetails>(`/api/servers/${serverId}/details`);
  });

export const fetchNetworkDetails = createServerFn({ method: 'GET' })
  .validator(serverSideId)
  .handler(async ({ data: networkId }): Promise<NetworkDetails | undefined> => {
    const data = ssrDataLayer();
    if (data) return data.getNetworkDetails(networkId);

    return viaHttpOptional<NetworkDetails>(`/api/networks/${networkId}/details`);
  });
