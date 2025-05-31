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
      console.log('Verifying token, JWT_SECRET exists:', !!JWT_SECRET);
      console.log('Token first 15 chars:', token.substring(0, 15) + '...');
      
      const decoded = jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
      console.log('Token successfully verified, payload:', decoded);
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
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
    
    console.log('Setting cookies for userId:', userId);
    console.log('Access token first 15 chars:', accessToken.substring(0, 15) + '...');

   
    const cookieOptions = {
        httpOnly: true,
        secure: true,     // HARUS true ketika sameSite: 'none'
        sameSite: 'none' as const, // 'none' diperlukan untuk cross-site
        path: '/' // Ensure cookie is available throughout the site
      };
    
    // CRITICAL DEBUG - Log semua cookie settings
    console.log('CRITICAL: Cookie setting yang digunakan:', cookieOptions);
    
    console.log('Cookie options:', cookieOptions);
    
    // Set access token cookie
    cookie.access_token.set({
      value: accessToken,
      ...cookieOptions,
      maxAge: 60 * 60 // 1 hour in seconds
    });
    
    // Set refresh token cookie
    cookie.refresh_token.set({
      value: refreshToken,
      ...cookieOptions,
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
      // Debug log request headers
      const allHeaders: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        allHeaders[key] = value;
      });
      // Get cookie header
      const cookies = request.headers.get('cookie') || ''
      console.log('Cookies exists:', !!cookies)
      
      // Find access token
      const tokenMatch = cookies.match(/access_token=([^;]+)/)
      
      if (!tokenMatch) {
        // console.log('No access_token found in cookies');
        return null;
      }
      
      const token = tokenMatch[1]
      
      if (!token) {
        console.log('Token is empty');
        return null;
      }
      
      // Verify token
      const payload = this.verifyToken(token)
      console.log('Token payload:', payload);
      
      if (!payload || payload.tokenType !== 'access') {
        console.log('Invalid token payload or wrong token type');
        return null;
      }
      
      console.log('Successfully extracted userId:', payload.userId);
      return payload.userId;
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
      console.log('Attempting to refresh token');
      const refreshToken = cookie.refresh_token.value
      console.log('Refresh token exists:', !!refreshToken);
      
      if (!refreshToken) return false
      
      const payload = this.verifyToken(refreshToken)
      console.log('Refresh token payload:', payload);
      
      if (!payload || payload.tokenType !== 'refresh') {
        console.log('Invalid refresh token or wrong token type');
        return false;
      }
      
      // Generate a new access token
      const accessToken = this.generateAccessToken(payload.userId)
      console.log('Generated new access token for userId:', payload.userId);
      
      // Cookie options - same as in setTokenCookies
      const isProd = process.env.ENVIRONMENT === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProd,     // true hanya jika di production
        sameSite: 'none' as const, // 'none' diperlukan untuk cross-site
        path: '/' // Ensure cookie is available throughout the site
      };
      
      console.log('CRITICAL: Refresh cookie settings:', cookieOptions);
      
      // Set the new access token cookie
      cookie.access_token.set({
        value: accessToken,
        ...cookieOptions,
        maxAge: 60 * 60 // 1 hour in seconds
      });
      
      console.log('Access token refreshed successfully');
      
      return true
    } catch (error) {
      console.error('Error refreshing access token:', error)
      return false
    }
  }
}

// Export a singleton instance
export const jwtService = new JwtService()
