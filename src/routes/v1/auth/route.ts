import { Elysia, t } from 'elysia'
import { authService } from '../../../services/auth.service'
import { userRepository } from '../../../repositories/user.repository'
import { jwtService } from '../../../services/jwt.service'

// Auth routes for handling authentication
export const authRoutes = new Elysia({ prefix: '/auth' })
  
  // Register a new user
  .post('/register', async ({ body }) => {
    console.log("[route] REGISTERING USER")
    return await authService.register(body)
  }, {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 }),
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
  
  // Change password
  .post('/change-password', async ({ body, request }) => {
    // Get user ID from JWT token in cookies
    const userId = jwtService.getUserIdFromCookies(request)
    
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized'
      }
    }
    
    // Call auth service to change password
    return await authService.changePassword(userId, body.currentPassword, body.newPassword)
  }, {
    body: t.Object({
      currentPassword: t.String(),
      newPassword: t.String({ minLength: 8 })
    })
  })

  .post('/me', async ({ body, request }) => {
    const userId = jwtService.getUserIdFromCookies(request)
    
    if (!userId) {
      return {
        success: false, 
        error: 'Unauthorized'
      }
    }
    
    await userRepository.updateUser(userId, body)
    return {
      success: true,
      message: "User updated successfully"
    }
  },{
    body: t.Object({
      name: t.String(),
      gender: t.Enum({ Male: 'Male', Female: 'Female' }),
      birthplace: t.String(),
      birthdate: t.String(),
      socializationLocation: t.String(),
      phoneNumber: t.String(),
    })
  }
  )
  
  // Get current user info (protected)
  .get('/me', async ({ request }) => {
    // Dapatkan userId dari auth middleware melalui cookie
    const userId = jwtService.getUserIdFromCookies(request)
    console.log("[route] user id from request: ", userId)
    
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
