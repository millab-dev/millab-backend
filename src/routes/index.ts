import { Elysia } from 'elysia'
import { v1Routes } from './v1'

// Main API router that combines all API versions
export const apiRoutes = new Elysia({ prefix: '/api' })
  .use(v1Routes)
  // When you need to add v2 routes, you would add them here:
  // .use(v2Routes)
