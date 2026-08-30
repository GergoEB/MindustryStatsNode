import { ElysiaCustomStatusResponse } from 'elysia'

// Shared in-memory response cache (or swap with Redis)
const cacheStore = new Map<string, { data: unknown; expiry: number }>()

interface CacheOptions<TQuery = any, TParams = any> {
  ttlMs?: number
  /**
   * Lambda function to generate a strict, normalized key from validated inputs
   */
  getKey?: (ctx: { query: TQuery; params: TParams; path: string }) => string
}

/**
 * Route response cache.
 *
 * SPREAD it into a route's hook options (`...withCache({ ttlMs })`). It must not be
 * passed as `use: [withCache(...)]` — Elysia 1.4 silently ignores beforeHandle /
 * afterHandle hooks supplied that way, so the cache never runs.
 */
export const withCache = <TQuery = any, TParams = any>(options: CacheOptions<TQuery, TParams>) => {
  const ttl = options.ttlMs ?? 60_000 // Default 60s TTL
  const getKey = options.getKey ?? (({ path }) => path)

  // Generate key ONLY from parameters passed into the lambda
  const keyOf = (ctx: any): string =>
    getKey({ query: ctx.query as TQuery, params: ctx.params as TParams, path: ctx.path })

  return {
    beforeHandle(ctx: any): void {
      const cached = cacheStore.get(keyOf(ctx))
      if (!cached || Date.now() >= cached.expiry) return

      ctx.set.headers['x-cache'] = 'HIT'
      // Returned as `void` on purpose: a real return type here would widen every
      // cached route's inferred response, which Eden Treaty reads. At runtime this
      // short-circuits with exactly what the handler would have produced.
      return cached.data as void
    },

    afterHandle(ctx: any): void {
      const value = ctx.responseValue
      if (value === undefined || value === null) return
      // Never cache an error: a 404 stored here would be replayed as a 200.
      if (value instanceof ElysiaCustomStatusResponse) return
      if (ctx.set.status !== undefined && ctx.set.status !== 200 && ctx.set.status !== 'OK') return

      cacheStore.set(keyOf(ctx), { data: value, expiry: Date.now() + ttl })
    },
  }
}
