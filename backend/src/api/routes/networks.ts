import { Elysia, status } from 'elysia';
import { getNetworkPlayerHistory } from '../../repositories/StatsRepository.js';
import { getNetworkDetails } from '../data/index.js';
import { ApiPacker } from '../../../../common/Packer.js';
import { IdParam, StrictNoQuery, StrictRangeQuery } from '../lib/schemas.js';
import { resolveRange } from '../lib/timeRange.js';
import { withCache } from '../middleware/cache.js';

export const networkRoutes = new Elysia({ prefix: '/api/networks' })
  .get('/:id/history', async ({ params, query }) => {
    const { hoursBack, bucketMinutes } = resolveRange(query.range);
    return ApiPacker.pack(await getNetworkPlayerHistory(params.id, hoursBack, bucketMinutes));
  }, {
    params: IdParam,
    query: StrictRangeQuery,
    ...withCache({
      ttlMs: 600_000, // 10 minutes TTL
      getKey: ({ path, params, query }) => `${path}:${params.id}:${query.range || ''}`,
    }),
  })

  // Cached in the data layer rather than here, so SSR's direct call shares it.
  .get('/:id/details', async ({ params }) => {
    const details = await getNetworkDetails(params.id);
    if (!details) return status(404, { error: 'Network not found' });
    return details;
  }, {
    params: IdParam,
    query: StrictNoQuery,
  });
