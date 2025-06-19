import { auth } from '../config/firebase'
import { User, CreateUserData } from '../models/user'
import { userRepository } from '../repositories/user.repository'
import { jwtService } from './jwt.service'
import { ApiResponse } from '../interface'

/**
 * Service for authentication operations
 */
export class AuthService {
  /**
   * Register a new user
   * @param userData User registration data
   * @returns Response with the created user or error
   */
  async register(userData: CreateUserData): Promise<ApiResponse<User>> {
    try {
      // Check if email already exists
      console.log("REGISTERING USER")
      const existingUserByEmail = await userRepository.getUserByEmail(userData.email)
      if (existingUserByEmail) {
        return {
          success: false,
          error: 'Email is already registered'
        }
      }
      
      // Create the user
      const user = await userRepository.createUser(userData)
      if (!user) {
        return {
          success: false,
          error: 'Failed to create user'
        }
      }
      
      return {
        success: true,
        message: 'User registered successfully',
        data: user
      }
    } catch (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: 'Registration failed'
      }
    }
  }
  
  /**
   * Login a user with email and password
   * @param email User email
   * @param password User password
   * @param cookie Elysia cookie context for setting tokens
   * @returns Response with user data or error
   */
  async login(email: string, password: string, cookie: any): Promise<ApiResponse<User>> {
    try {
      if (!auth) {
        return {
          success: false,
          error: 'Authentication service not initialized'
        }
      }
      
      // In a production environment, we need to use Firebase Auth REST API
      // for email/password verification since Firebase Admin SDK doesn't support
      // direct password verification
      try {
        // Get Firebase API key from environment variables
        const apiKey = process.env.FIREBASE_API_KEY
        if (!apiKey) {
          console.error('Firebase API key is not configured')
          return {
            success: false,
            error: 'Authentication configuration error'
          }
        }
        // Use Firebase Auth REST API for email/password authentication
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true
            })
          }
        )

        if (!response.ok) {
          // Authentication failed (wrong password, invalid user, etc.)
          const errorData = await response.json()
          console.error('Firebase Auth error:', errorData)
          
          return {
            success: false,
            error: 'Invalid email or password'
          }
        }

        // Authentication succeeded, get the Firebase UID from response
        const authData = await response.json()
        const firebaseUid = authData.localId
        // Get the user from our database using Firebase UID
        const user = await userRepository.getUserById(firebaseUid)
        
        if (!user) {
          // User exists in Firebase Auth but not in our database
          // This should rarely happen in a well-designed system, but we handle it
          console.error(`User with Firebase UID ${firebaseUid} found in Firebase Auth but not in database`)
          return {
            success: false,
            error: 'User account issue. Please contact support.'
          }
        }
        
        // Set JWT tokens as cookies
        jwtService.setTokenCookies(cookie, user.id)
        
        return {
          success: true,
          message: 'Login successful',
          data: user
        }
      } catch (error) {
        console.error('Firebase authentication error:', error)
        return {
          success: false,
          error: 'Authentication failed'
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }
  }
  
  /**
   * Refresh the access token
   * @param cookie Elysia cookie context
   * @returns Success or failure response
   */
  refreshToken(cookie: any): ApiResponse {
    const success = jwtService.refreshAccessToken(cookie)
    
    if (!success) {
      return {
        success: false,
        error: 'Invalid refresh token'
      }
    }
    
    return {
      success: true,
      message: 'Token refreshed successfully'
    }
  }
  
  /**
   * Logout the user by clearing authentication cookies
   * @param cookie Elysia cookie context
   * @returns Success response
   */
  logout(cookie: any): ApiResponse {
    jwtService.clearTokenCookies(cookie)
    
    return {
      success: true,
      message: 'Logout successful'
    }
  }
  
  /**
   * Get the current user from a request
   * @param request HTTP request with cookies
   * @returns The user or null if not authenticated
   */
  async getCurrentUser(request: Request): Promise<User | null> {
    const userId = jwtService.getUserIdFromCookies(request)
    if (!userId) return null
    
    return await userRepository.getUserById(userId)
  }
  
  /**
   * Change user password
   * @param userId User ID
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns Success or error response
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ApiResponse> {
    try {
      if (!auth) {
        return {
          success: false,
          error: 'Authentication service not initialized'
        }
      }
      
      // Firebase Admin SDK doesn't support verifying passwords directly
      // So we need to use the Firebase Auth REST API to verify the current password
      const apiKey = process.env.FIREBASE_API_KEY
      if (!apiKey) {
        console.error('Firebase API key is not configured')
        return {
          success: false,
          error: 'Authentication configuration error'
        }
      }
      
      // Get user email from user ID
      const user = await userRepository.getUserById(userId)
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        }
      }
      
      // 1. Verify current password using Firebase Auth REST API
      const verifyResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            password: currentPassword,
            returnSecureToken: true
          })
        }
      )
      
      if (!verifyResponse.ok) {
        // Current password is incorrect
        return {
          success: false,
          error: 'Current password is incorrect'
        }
      }
      
      // 2. Update password using Firebase Admin SDK
      await auth.updateUser(userId, {
        password: newPassword
      })
      
      return {
        success: true,
        message: 'Password changed successfully'
      }
    } catch (error) {
      console.error('Change password error:', error)
      return {
        success: false,
        error: 'Failed to change password'
      }
    }
  }
  
  /**
   * Check if a user is authenticated
   * @param request HTTP request with cookies
   * @param set Elysia response context
   * @returns The user or null if not authenticated
   */
  async requireAuth({ request, set }: { request: Request, set: any }): Promise<User | null> {
    const user = await this.getCurrentUser(request)
    
    if (!user) {
      set.status = 401
      set.headers = {
        ...set.headers,
        'Content-Type': 'application/json'
      }
      return null
    }
    
    return user
  }

  /**
   * Handle Google Sign-In
   * @param idToken Google ID token
   * @param cookie Elysia cookie context for setting tokens
   * @returns Response with user data or error
   */
  async googleSignIn(idToken: string, cookie: any): Promise<ApiResponse<{ user: User, needsProfile: boolean }>> {
    try {
      if (!auth) {
        return {
          success: false,
          error: 'Authentication service not initialized'
        }
      }

      // Verify the Google ID token with Firebase
      const decodedToken = await auth.verifyIdToken(idToken)
      const { uid, email, name, picture } = decodedToken

      if (!email) {
        return {
          success: false,
          error: 'Email not provided by Google'
        }
      }

      // Check if user already exists in our database
      let user = await userRepository.getUserById(uid)

      if (user) {
        // User exists, check if profile is complete
        const needsProfile = !user.name || !user.gender || !user.birthplace || 
                            !user.birthdate || !user.socializationLocation || !user.phoneNumber

        // Set JWT tokens as cookies
        jwtService.setTokenCookies(cookie, user.id)

        return {
          success: true,
          message: 'Login successful',
          data: {
            user,
            needsProfile
          }
        }
      }

      // User doesn't exist, create a partial user record
      const partialUserData: Partial<CreateUserData> = {
        email,
        name: name || email.split('@')[0], // Fallback name
        // These fields will be filled later
        username: '',
        gender: 'Female', // Default, will be updated
        birthplace: '',
        birthdate: '',
        socializationLocation: '',
        phoneNumber: '',
        password: '' // Not needed for Google users
      }

      try {
        // Create user with Firebase UID as the document ID
        const newUser = await userRepository.createUserWithId(uid, partialUserData as CreateUserData)
        
        if (!newUser) {
          return {
            success: false,
            error: 'Failed to create user account'
          }
        }

        // Set JWT tokens as cookies
        jwtService.setTokenCookies(cookie, newUser.id)

        return {
          success: true,
          message: 'Account created successfully',
          data: {
            user: newUser,
            needsProfile: true // New Google users always need to complete profile
          }
        }
      } catch (error) {
        console.error('Error creating Google user:', error)
        return {
          success: false,
          error: 'Failed to create user account'
        }
      }
    } catch (error) {
      console.error('Google Sign-In error:', error)
      return {
        success: false,
        error: 'Google authentication failed'
      }
    }
  }

  /**
   * Complete user profile after Google Sign-In
   * @param userId User ID
   * @param profileData Additional profile data
   * @returns Response with updated user data or error
   */  async completeProfile(userId: string, profileData: {
    name: string
    gender: 'Male' | 'Female'
    birthplace: string
    birthdate: string
    socializationLocation: string
    phoneNumber: string
  }): Promise<ApiResponse<User>> {
    try {
      // Check if name is already taken by another user
      const existingUser = await userRepository.getUserByName(profileData.name)
      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: 'Name is already taken'
        }
      }

      // Update the user with the complete profile
      const updatedUser = await userRepository.updateUser(userId, {
        name: profileData.name,
        gender: profileData.gender,
        birthplace: profileData.birthplace,
        birthdate: profileData.birthdate,
        socializationLocation: profileData.socializationLocation,
        phoneNumber: profileData.phoneNumber
      })

      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to update user profile'
        }
      }

      return {
        success: true,
        message: 'Profile completed successfully',
        data: updatedUser
      }
    } catch (error) {
      console.error('Complete profile error:', error)
      return {
        success: false,
        error: 'Failed to complete profile'
      }
    }
  }

  /**
   * Get Google OAuth authorization URL
   * @returns Google OAuth URL for redirection
   */
  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/v1/auth/google/callback`
    const scope = 'openid email profile'
    const state = Math.random().toString(36).substring(7) // Simple state parameter
    
    const params = new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent'
    })
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Handle Google OAuth callback
   * @param code Authorization code from Google
   * @param cookie Elysia cookie context for setting tokens
   * @returns Response with user data or error
   */  async handleGoogleCallback(code: string, cookie: any): Promise<ApiResponse<{ user: User, needsProfile: boolean }>> {
    try {
      console.log('🔄 Starting Google OAuth callback process...')
      console.log('📋 Environment check:', {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        backendUrl: process.env.BACKEND_URL || 'http://localhost:8080'
      })

      // Exchange authorization code for access token
      const tokenRequest = {
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/v1/auth/google/callback`,
      }
      
      console.log('📤 Token exchange request:', {
        ...tokenRequest,
        client_secret: '***HIDDEN***',
        code: code.substring(0, 20) + '...'
      })

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest),
      })

      console.log('📥 Token response status:', tokenResponse.status)

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('❌ Failed to exchange code for token:', errorText)
        return {
          success: false,
          error: 'Failed to authenticate with Google'
        }
      }      const tokenData = await tokenResponse.json()
      const { access_token } = tokenData
      
      console.log('✅ Token exchange successful, access_token received:', !!access_token)

      // Get user information from Google
      console.log('📤 Fetching user info from Google...')
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      console.log('📥 User info response status:', userResponse.status)

      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('❌ Failed to get user info from Google:', errorText)
        return {
          success: false,
          error: 'Failed to get user information from Google'
        }
      }

      const googleUser = await userResponse.json()
      const { id: googleId, email, name, picture } = googleUser
      
      console.log('👤 Google user data:', {
        googleId,
        email,
        name,
        hasPicture: !!picture
      })

      if (!email) {
        console.error('❌ No email provided by Google')
        return {
          success: false,
          error: 'Email not provided by Google'
        }
      }

      // Check if user already exists in our database by email
      console.log('🔍 Checking if user exists in database...')
      let user = await userRepository.getUserByEmail(email)
      
      if (user) {
        console.log('✅ Existing user found:', { userId: user.id, email: user.email })
        // User exists, check if profile is complete
        const needsProfile = !user.name || !user.gender || !user.birthplace || 
                            !user.birthdate || !user.socializationLocation || !user.phoneNumber

        console.log('📋 Profile completeness check:', {
          hasname: !!user.name,
          hasGender: !!user.gender,
          hasBirthplace: !!user.birthplace,
          hasBirthdate: !!user.birthdate,
          hasSocializationLocation: !!user.socializationLocation,
          hasPhoneNumber: !!user.phoneNumber,
          needsProfile
        })

        // Set JWT tokens as cookies
        console.log('🍪 Setting JWT cookies...')
        jwtService.setTokenCookies(cookie, user.id)

        return {
          success: true,
          message: 'Login successful',
          data: {
            user,
            needsProfile
          }
        }
      }      // User doesn't exist, create a new user record
      console.log('👤 User not found, creating new Firebase Auth user...')
      
      const partialUserData: CreateUserData = {
        email,
        name: `user_${Date.now()}`, // Temporary name, will be updated in complete profile
        username: '', // Will be set later
        gender: 'Female', // Default, will be updated
        birthplace: '',
        birthdate: '',
        socializationLocation: '',
        phoneNumber: '',
        password: `google_oauth_${Date.now()}` // Temporary password for Firebase Auth
      }

      console.log('📝 Creating Firebase Auth user with data:', {
        email: partialUserData.email,
        name: partialUserData.name
      })

      try {
        // Create user with Firebase Auth + Firestore (same as regular registration)
        const newUser = await userRepository.createUser(partialUserData)
        
        if (!newUser) {
          console.error('❌ Failed to create user - userRepository.createUser returned null')
          return {
            success: false,
            error: 'Failed to create user account'
          }
        }

        console.log('✅ New Firebase Auth + Firestore user created:', { 
          userId: newUser.id, 
          email: newUser.email 
        })

        // Set JWT tokens as cookies
        console.log('🍪 Setting JWT cookies for new user...')
        jwtService.setTokenCookies(cookie, newUser.id)

        return {
          success: true,
          message: 'Account created successfully',
          data: {
            user: newUser,
            needsProfile: true // New Google users always need to complete profile
          }
        }
      } catch (error) {
        console.error('💥 Error creating Google user:', error)
        return {
          success: false,
          error: 'Failed to create user account'
        }
      }
    } catch (error) {
      console.error('💥 Google OAuth callback error:', error)
      return {
        success: false,
        error: 'Google authentication failed'
      }
    }
  }
}

// Export a singleton instance
export const authService = new AuthService()
