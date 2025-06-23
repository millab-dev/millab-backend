import { Elysia, t } from 'elysia'
import { authService } from '../../../services/auth.service'
import { userRepository } from '../../../repositories/user.repository'
import { jwtService } from '../../../services/jwt.service'

// Auth routes for handling authentication
export const authRoutes = new Elysia({ prefix: '/auth' })
  
  // Register a new user
  .post('/register', async ({ body }) => {
    console.log("[route] REGISTERING USER")
    return await authService.register(body)  }, {
    body: t.Object({
      name: t.String(),
      username: t.String(),
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
      email: t.String(),
      password: t.String()
    })
  })  // Google Sign-In OAuth redirect
  .get('/google/redirect', ({ set }) => {
    try {
      const googleAuthUrl = authService.getGoogleAuthUrl()
      
      // Check if we have valid Google OAuth configuration
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        set.status = 500
        return {
          success: false,
          error: 'Google OAuth belum dikonfigurasi. Mohon atur variabel lingkungan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET.'
        }
      }
      
      set.status = 302
      set.headers['Location'] = googleAuthUrl
      return
    } catch (error) {
      console.error('Google redirect error:', error)
      set.status = 500
      return {
        success: false,
        error: 'Gagal membuat URL Google OAuth'
      }
    }
  })  // Google OAuth callback
  .get('/google/callback', async ({ query, cookie, set }) => {
    try {
      console.log('=== Google OAuth Callback ===')
      console.log('Query params:', query)
      const { code, state } = query
      
      if (!code) {
        console.log('❌ No authorization code received')
        set.status = 302
        set.headers['Location'] = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?error=oauth_cancelled`
        return
      }

      console.log('✅ Authorization code received:', code?.substring(0, 20) + '...')
      const result = await authService.handleGoogleCallback(code as string, cookie)
      console.log('📄 Callback result:', {
        success: result.success,
        hasData: !!result.data,
        needsProfile: result.data?.needsProfile,
        error: result.error
      })
      
      if (result.success && result.data) {
        // Generate tokens directly here
        const accessToken = jwtService.generateAccessToken(result.data.user.id)
        const refreshToken = jwtService.generateRefreshToken(result.data.user.id)
        
        console.log('🔑 Generated tokens for redirection')
        
        // Build URLs with tokens as search parameters
        if (result.data.needsProfile) {
          console.log('🔄 Redirecting to complete-profile')
          set.status = 302
          set.cookie = cookie
          const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/oauth-redirect?` +
                      `destination=/complete-profile&` +
                      `access_token=${encodeURIComponent(accessToken)}&` +
                      `refresh_token=${encodeURIComponent(refreshToken)}`
          set.headers['Location'] = url
        } else {
          console.log('🏠 Redirecting to home')
          set.status = 302
          set.cookie = cookie
          const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/oauth-redirect?` +
                      `destination=/app&` +
                      `access_token=${encodeURIComponent(accessToken)}&` +
                      `refresh_token=${encodeURIComponent(refreshToken)}`
          set.headers['Location'] = url
        }
      } else {
        console.log('❌ OAuth failed, redirecting to signin with error')
        set.status = 302
        set.headers['Location'] = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?error=oauth_failed`
      }
    } catch (error) {
      console.error('💥 Google OAuth callback error:', error)
      set.status = 302
      set.headers['Location'] = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?error=oauth_error`
    }
  })

  // Google Sign-In (legacy endpoint for Firebase token - keeping for compatibility)
  .post('/google', async ({ body, cookie }) => {
    return await authService.googleSignIn(body.idToken, cookie)
  }, {
    body: t.Object({
      idToken: t.String()
    })
  })

  // Complete profile for Google Sign-In users
  .post('/complete-profile', async ({ body, request }) => {
    const userId = jwtService.getUserIdFromCookies(request)
    if (!userId) {
      return {
        success: false,
        error: 'Tidak memiliki akses'
      }
    }
    return await authService.completeProfile(userId, body)  }, {
    body: t.Object({
      name: t.String(),
      username: t.String(),
      gender: t.Enum({ Male: 'Male', Female: 'Female' }),
      birthplace: t.String(),
      birthdate: t.String(),
      socializationLocation: t.String(),
      phoneNumber: t.String()
    })
  })
  
  // Logout user
  .post('/logout', ({ cookie }) => {
    return authService.logout(cookie)
  })
  
  // Refresh token endpoint
  .get('/refresh', ({ cookie }) => {
    console.log('Explicit token refresh requested');
    return authService.refreshToken(cookie);
  })
  
  // Change password
  .post('/change-password', async ({ body, request }) => {
    // Get user ID from JWT token in cookies
    const userId = jwtService.getUserIdFromCookies(request)
    
    if (!userId) {
      return {
        success: false,
        error: 'Tidak memiliki akses'
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
        error: 'Tidak memiliki akses'
      }
    }
    
    await userRepository.updateUser(userId, body)
    return {
      success: true,
      message: "Profil pengguna berhasil diperbarui"
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
        error: 'Tidak memiliki akses'
      }
    }
    
    // Menggunakan userId untuk mendapatkan data user
    const user = await userRepository.getUserById(userId)
    
    if (!user) {
      return {
        success: false,
        error: 'Pengguna tidak ditemukan'
      }
    }
    
    return {
      success: true,
      data: user
    }
  })
