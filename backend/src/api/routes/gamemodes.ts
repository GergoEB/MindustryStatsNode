import { Elysia } from 'elysia';
import { getServerShareByGamemode } from '../../repositories/GlobalStatsRepository.js';
import { getGamemodes } from '../data/index.js';
import { removeColorsFromMindustry } from '../../../../common/Mindustry.js';
import { type ServerShareEntry } from '../../../../common/models/GlobalStatsTypes.js';
import { ApiPacker } from '../../../../common/Packer.js';
import { ModeIdParam, StrictHistoryQuery, StrictNoQuery } from '../lib/schemas.js';
import { parseTimestamp, resolveRange } from '../lib/timeRange.js';
import { withCache } from '../middleware/cache.js';

export const gamemodeRoutes = new Elysia({ prefix: '/api/gamemodes' })
  // The list itself is cached in the data layer (SSR reads it there, unpacked);
  // packing it is cheap and only this HTTP path needs it.
  .get('', async () => ApiPacker.pack(await getGamemodes()), {
    query: StrictNoQuery,
  })

  .get('/:modeId/servers', async ({ params, query }) => {
    // range alone drives hoursBack; startDate/endDate are extra repo filters (see global.ts)
    const { hoursBack, bucketMinutes } = resolveRange(query.range);
    const startDate = parseTimestamp(query.startDate);
    const endDate = parseTimestamp(query.endDate);

    const serverShare = await getServerShareByGamemode(params.modeId, hoursBack, bucketMinutes, startDate, endDate);

    return ApiPacker.pack(serverShare.map((item): ServerShareEntry => ({
      ...item,
      groupName: removeColorsFromMindustry(item.groupName) ?? 'Null',
      serverName: removeColorsFromMindustry(item.serverName) ?? 'Null',
    })));
  }, {
    params: ModeIdParam,
    query: StrictHistoryQuery,
    ...withCache({
      ttlMs: 600_000, // 10 minutes TTL
      getKey: ({ path, params, query }) => `${path}:${params.modeId}:${query.range || ''}:${query.startDate || ''}:${query.endDate || ''}`,
    }),
  });
