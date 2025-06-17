import { Elysia } from 'elysia'
import { healthRoutes } from './health/route'
import { authRoutes } from './auth/route'
import { moduleRoutes } from './modules/route'
import { readingStateRoutes } from './reading-state/route'

// Combine all v1 routes
export const v1Routes = new Elysia({ prefix: '/v1' })
  .use(healthRoutes)
  .use(authRoutes)
  .use(moduleRoutes)
  .use(readingStateRoutes)
