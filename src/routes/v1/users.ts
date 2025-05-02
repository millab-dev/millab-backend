import { Elysia } from 'elysia'

// Users routes
export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/', () => 'Get all users')
  .get('/:id', ({ params: { id } }) => `Get user with id ${id}`)
  .post('/', () => 'Create user')
  .put('/:id', ({ params: { id } }) => `Update user with id ${id}`)
  .delete('/:id', ({ params: { id } }) => `Delete user with id ${id}`)
