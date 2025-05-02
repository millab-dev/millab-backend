import jwt from 'jsonwebtoken'
import { JwtPayload as CustomJwtPayload, TokenPayload } from '../interface'

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '1h'
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'



/**
 * Service for handling JWT operations
 */
export class JwtService {
  /**
   * Generate an access token for a user
   * @param userId The user ID to include in the token
   * @returns The signed JWT token string
   */
  generateAccessToken(userId: string): string {
    try {
      const payload: TokenPayload = { userId, tokenType: 'access' }
      
      // Using type assertion to handle jsonwebtoken's strict typing
      return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: ACCESS_TOKEN_EXPIRY 
      } as jwt.SignOptions)
    } catch (error) {
      console.error('Error generating access token:', error)
      throw new Error('Failed to generate access token')
    }
  }

  /**
   * Generate a refresh token for a user
   * @param userId The user ID to include in the token
   * @returns The signed JWT token string
   */
  generateRefreshToken(userId: string): string {
    try {
      const payload: TokenPayload = { userId, tokenType: 'refresh' }
      
      // Using type assertion to handle jsonwebtoken's strict typing
      return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: REFRESH_TOKEN_EXPIRY 
      } as jwt.SignOptions)
    } catch (error) {
      console.error('Error generating refresh token:', error)
      throw new Error('Failed to generate refresh token')
    }
  }

  /**
   * Verify a JWT token
   * @param token The token to verify
   * @returns The decoded token payload or null if invalid
   */
  verifyToken(token: string): CustomJwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as CustomJwtPayload
    } catch (error) {
      console.error('Token verification error:', error)
      return null
    }
  }

  /**
   * Set tokens as HTTP-only cookies
   * @param response The Elysia context to set cookies on
   * @param userId The user ID for generating tokens
   */
  setTokenCookies(cookie: any, userId: string): void {
    const accessToken = this.generateAccessToken(userId)
    const refreshToken = this.generateRefreshToken(userId)
    
    // Set access token cookie
    cookie.access_token.set({
      value: accessToken,
      httpOnly: true,
      secure: process.env.ENVIRONMENT !== 'dev',
      maxAge: 60 * 60 // 1 hour in seconds
    })
    
    // Set refresh token cookie
    cookie.refresh_token.set({
      value: refreshToken,
      httpOnly: true,
      secure: process.env.ENVIRONMENT !== 'dev',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    })
  }

  /**
   * Clear authentication cookies
   * @param cookie The Elysia context to clear cookies from
   */
  clearTokenCookies(cookie: any): void {
    cookie.access_token.remove()
    cookie.refresh_token.remove()
  }

  /**
   * Get user ID from request cookies
   * @param request The HTTP request with cookies
   * @returns The user ID or null if not authenticated
   */
  getUserIdFromCookies(request: Request): string | null {
    try {
      const cookies = request.headers.get('cookie') || ''
      const tokenMatch = cookies.match(/access_token=([^;]+)/)
      if (!tokenMatch) return null
      
      const token = tokenMatch[1]
      if (!token) return null
      
      const payload = this.verifyToken(token)
      if (!payload || payload.tokenType !== 'access') return null
      
      return payload.userId
    } catch (error) {
      console.error('Error getting user ID from cookies:', error)
      return null
    }
  }

  /**
   * Refresh the access token using the refresh token
   * @param cookie The Elysia context for cookie operations
   * @returns True if successful, false otherwise
   */
  refreshAccessToken(cookie: any): boolean {
    try {
      const refreshToken = cookie.refresh_token.value
      if (!refreshToken) return false
      
      const payload = this.verifyToken(refreshToken)
      if (!payload || payload.tokenType !== 'refresh') return false
      
      // Generate a new access token
      const accessToken = this.generateAccessToken(payload.userId)
      
      // Set the new access token cookie
      cookie.access_token.set({
        value: accessToken,
        httpOnly: true,
        secure: process.env.ENVIRONMENT !== 'dev',
        maxAge: 60 * 60 // 1 hour in seconds
      })
      
      return true
    } catch (error) {
      console.error('Error refreshing access token:', error)
      return false
    }
  }
}

// Export a singleton instance
export const jwtService = new JwtService()
