/**
 * The data layer behind the routes the frontend loads pages with.
 *
 * Each function is the whole of an endpoint's work minus the transport: validate
 * nothing, read no headers, just produce the value. `routes/*` wrap these for
 * HTTP; the SSR bundle calls them directly through `registry.ts`. Both paths
 * therefore share one cache and one live `serversList`.
 *
 * Values are returned unpacked wherever the consumer wants objects — packing is
 * a wire-format concern, and an in-process caller should not pay for it. The one
 * exception is the server list, which is large enough that keeping it packed
 * shrinks the SSR payload it gets embedded into.
 */

import { createLogger } from '../../logger.js';
import * as serverRepository from '../../repositories/serverRepository.js';
import { getGamemodeList } from '../../repositories/GlobalStatsRepository.js';
import { serversList } from '../../state/serversList.js';
import { ApiPacker, type ApiResponsePacket } from '../../../../common/Packer.js';
import type { GamemodeInfo } from '../../../../common/models/GlobalStatsTypes.js';
import type { NetworkDetails, ServerDetails, ServerElement } from '../../../../common/models/serverData.js';
import { cached } from './cache.js';

const logger = createLogger('ApiData');

const TTL = {
  servers: 180_000,
  serverDetails: 180_000,
  networkDetails: 300_000,
  gamemodes: 600_000,
} as const;

/**
 * The live server list, packed. Reads from memory, so the cache here is only
 * saving the repack — which is the expensive half at ~700 servers.
 */
export function getServerListPacked(): Promise<ApiResponsePacket> {
  return cached('servers', TTL.servers, async () => {
    const servers = Array.from(serversList.values());
    logger.debug(`Served ${servers.length} servers from cache`);
    return ApiPacker.pack(servers);
  });
}

export function getGamemodes(): Promise<GamemodeInfo[]> {
  return cached('gamemodes', TTL.gamemodes, () => getGamemodeList());
}

/**
 * A miss is cached too, unlike the old route-level cache which only stored 200s.
 * That is deliberate: unknown ids are what a crawler generates, and the list this
 * is reached from is itself three minutes stale, so a new server was never going
 * to be linked sooner than that anyway.
 */
export function getServerDetails(serverId: number): Promise<(ServerElement & ServerDetails) | undefined> {
  return cached(`server:${serverId}`, TTL.serverDetails, () => serverRepository.getServer(serverId));
}

export function getNetworkDetails(groupId: number): Promise<NetworkDetails | undefined> {
  return cached(`network:${groupId}`, TTL.networkDetails, () => serverRepository.getNetworkDetails(groupId));
}
