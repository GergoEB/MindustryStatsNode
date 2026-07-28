import {
  createRequestHandler,
  defaultRenderHandler,
} from '@tanstack/react-router/ssr/server'
import { createRouter } from './router'

export async function render({ request }: { request: Request }) {
  const handler = createRequestHandler({ request, createRouter })

  return await handler(defaultRenderHandler)
}