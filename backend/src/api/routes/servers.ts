import { Elysia, status } from 'elysia';
import { getMapHistory, getMotdHistory } from '../../repositories/serverRepository.js';
import { getAggregatedHistory } from '../../repositories/StatsRepository.js';
import { ApiPacker } from '../../../../common/Packer.js';
import { getServerDetails, getServerListPacked } from '../data/index.js';
import { IdParam, StrictHistoryQuery, StrictNoQuery, StrictPaginationQuery } from '../lib/schemas.js';
import { parseTimestamp, resolveRange } from '../lib/timeRange.js';
import { withCache } from '../middleware/cache.js';

export const serverRoutes = new Elysia({ prefix: '/api' })
  // No withCache on the next two: their caching lives in the data layer so that
  // SSR, which calls them without going through HTTP, shares the same entries.
  .get('/servers', () => getServerListPacked(), {
    query: StrictNoQuery,
  })

  .get('/servers/:id/details', async ({ params }) => {
    const server = await getServerDetails(params.id);
    if (!server) return status(404, { error: 'Server not found' });
    return server;
  }, {
    params: IdParam,
    query: StrictNoQuery,
  })

  .get('/servers/:id/motd-history', async ({ params, query }) => {
    const { page = '1', perPage = '20' } = query;
    const pageNumber = parseInt(page, 10) || 1;
    const perPageNumber = Math.min(parseInt(perPage, 10) || 20, 100);

    const result = await getMotdHistory(params.id, pageNumber, perPageNumber);
    return result.data;
  }, {
    params: IdParam,
    query: StrictPaginationQuery,
    ...withCache({
      ttlMs: 300_000, // 5 minutes TTL
      getKey: ({ path, params, query }) => `${path}:${params.id}:${query.page || '1'}:${query.perPage || '20'}`,
    }),
  })

  .get('/servers/:id/map-history', async ({ params, query }) => {
    const { page = '1', perPage = '20' } = query;
    const pageNumber = parseInt(page, 10) || 1;
    const perPageNumber = Math.min(parseInt(perPage, 10) || 20, 100);

    const result = await getMapHistory(params.id, pageNumber, perPageNumber);
    return result.data;
  }, {
    params: IdParam,
    query: StrictPaginationQuery,
    ...withCache({
      ttlMs: 300_000, // 5 minutes TTL
      getKey: ({ path, params, query }) => `${path}:${params.id}:${query.page || '1'}:${query.perPage || '20'}`,
    }),
  })

  .get('/servers/:id/history', async ({ params, query }) => {
    const startDate = parseTimestamp(query.startDate);
    const endDate = parseTimestamp(query.endDate);
    const { hoursBack, bucketMinutes } = resolveRange(query.range, startDate, endDate);

    return ApiPacker.pack(await getAggregatedHistory(params.id, hoursBack, bucketMinutes, startDate, endDate));
  }, {
    params: IdParam,
    query: StrictHistoryQuery,
    ...withCache({
      ttlMs: 300_000, // 5 minutes TTL
      getKey: ({ path, params, query }) => `${path}:${params.id}:${query.range || ''}:${query.startDate || ''}:${query.endDate || ''}`,
    }),
  });
