import { Elysia } from 'elysia'

// Health check routes
export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'dev'
  }))
  .get('/ping', () => 'pong')
