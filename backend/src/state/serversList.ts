import { type ServerElement } from '../../../common/models/serverData.js';

/**
 * Live snapshot of every tracked server, keyed by CACHE_KEYS.SERVER_DATA(id).
 * Written by ServerProcessorService, read by the API. It lives here rather than
 * on the app object so neither side has to import the other.
 */
export const serversList = new Map<string, ServerElement>();
