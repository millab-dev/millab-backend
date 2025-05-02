import { Elysia } from 'elysia'
import { healthRoutes } from './health'
import { userRoutes } from './users'

// Combine all v1 routes
export const v1Routes = new Elysia({ prefix: '/v1' })
  .use(healthRoutes)
  .use(userRoutes)
