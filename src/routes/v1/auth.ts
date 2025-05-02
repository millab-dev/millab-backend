import { Elysia, t } from 'elysia'
import { authService } from '../../services/auth.service'
import { userRepository } from '../../repositories/user.repository'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { jwtService } from '../../services/jwt.service'

// Auth routes for handling authentication
export const authRoutes = new Elysia({ prefix: '/auth' })
  
  // Register a new user
  .post('/register', async ({ body }) => {
    return await authService.register(body)
  }, {
    body: t.Object({
      name: t.String(),
      username: t.String(),
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      gender: t.Enum({ Male: 'Male', Female: 'Female' }), // Menggunakan enum untuk validasi
      birthplace: t.String(),
      birthdate: t.String(),
      socializationLocation: t.String(),
      phoneNumber: t.String(),
      photoURL: t.Optional(t.String())
    })
  })
  
  // Login user
  .post('/login', async ({ body, cookie }) => {
    const { email, password } = body
    return await authService.login(email, password, cookie)
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    })
  })
  
  // Logout user
  .post('/logout', ({ cookie }) => {
    return authService.logout(cookie)
  })
  
  // Get current user info (protected)
  .get('/me', async ({ request }) => {
    // Dapatkan userId dari auth middleware melalui cookie
    const userId = jwtService.getUserIdFromCookies(request)
    
    if (!userId) {
      return {
        success: false, 
        error: 'Unauthorized'
      }
    }
    
    // Menggunakan userId untuk mendapatkan data user
    const user = await userRepository.getUserById(userId)
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }
    
    return {
      success: true,
      data: user
    }
  })
