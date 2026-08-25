//import { treaty } from '@elysiajs/eden';
import { createIsomorphicFn } from '@tanstack/react-start';

export const getBaseUrl = createIsomorphicFn()
  .server(() => 'http://localhost:' + (process.env.PORT || 3000))
  .client(() => ''); // Client can add base from just window.location