import { Elysia } from 'elysia';
import { getInactiveServers, getServerListStats } from '../../repositories/ServerListRepository.js';
import { ApiPacker } from '../../../../common/Packer.js';
import { StrictNoQuery } from '../lib/schemas.js';
import { withCache } from '../middleware/cache.js';

export const serverListRoutes = new Elysia({ prefix: '/api' })
  .get('/inactive-servers', async () => {
    const inactiveServers = await getInactiveServers();
    // Remove "old" servers which aren't in any list, just also aren't pruned from database
    return ApiPacker.pack(inactiveServers.filter((server) => server.serverLists.length >= 1));
  }, {
    query: StrictNoQuery,
    ...withCache({ ttlMs: 3_600_000 }), // 1 hour TTL
  })

  .get('/serverlist-stats', async () => ApiPacker.pack(await getServerListStats()), {
    query: StrictNoQuery,
    ...withCache({ ttlMs: 3_600_000 * 60 }), // 60 hours TTL, matches original ttlMs literal
  });
