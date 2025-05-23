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
}

// Export a singleton instance
export const authService = new AuthService()
