import { treaty } from '@elysia/eden';
import type { Api } from '../../../backend/src/api/app.ts';
import { getBaseUrl } from './getApi.ts';

/**
 * Typed API client, inferred straight from the backend's Elysia app — no hand-written
 * response types. The `Api` import is type-only, so none of the backend ships to the
 * browser.
 *
 * `getBaseUrl()` returns '' on the client (fetch resolves that against the page), but
 * treaty needs a real origin, so fall back to the page's own.
 */
export const api = treaty<Api>(
  getBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
);
