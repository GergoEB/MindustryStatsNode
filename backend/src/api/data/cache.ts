/**
 * Value cache for the data layer.
 *
 * `withCache` (middleware/cache.ts) memoises whole HTTP responses and can only
 * run when a request actually arrives. Anything the SSR bundle calls in-process
 * never reaches it, so the shared work is memoised one level down instead: here,
 * around the repository call, where both callers see the same entry.
 *
 * Entries hold the in-flight promise rather than the settled value, so a burst
 * of concurrent misses on a cold key issues one query instead of N.
 */

interface Entry {
  value: Promise<unknown>;
  expiry: number;
}

const store = new Map<string, Entry>();

/** Swept lazily on write — keys are bounded by server/network count, not traffic. */
const SWEEP_THRESHOLD = 4096;

function sweep(now: number): void {
  for (const [key, entry] of store) {
    if (now >= entry.expiry) store.delete(key);
  }
}

/**
 * Returns the cached value for `key`, or runs `produce` and caches it for `ttlMs`.
 * A rejection is never cached: the entry is dropped so the next caller retries.
 */
export function cached<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now < hit.expiry) return hit.value as Promise<T>;

  if (store.size >= SWEEP_THRESHOLD) sweep(now);

  const value = produce();
  store.set(key, { value, expiry: now + ttlMs });

  value.catch(() => {
    // Only drop our own entry — a later call may already have replaced it.
    if (store.get(key)?.value === value) store.delete(key);
  });

  return value;
}
