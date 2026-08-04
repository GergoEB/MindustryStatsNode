//import { treaty } from '@elysiajs/eden';
import { createIsomorphicFn } from '@tanstack/react-start';

export const getBaseUrl = createIsomorphicFn()
  .server(() => process.env.INTERNAL_API_URL || 'http://localhost:3000')
  .client(() => ''); // Client can add base from just window.location