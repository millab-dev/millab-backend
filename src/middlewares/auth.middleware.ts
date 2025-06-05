import { Elysia } from 'elysia'
import { jwtService } from '../services/jwt.service'

/**
 * Authentication middleware for Elysia.js
 * Automatically handles token refresh if needed
 * Super minimal - just refreshes tokens, nothing else
 */
export const authMiddleware = new Elysia()
  // Hook to run before all requests
  .onBeforeHandle(({ request, cookie, set }) => {
    try {
      // Check if access token is valid
      const userId = jwtService.getUserIdFromCookies(request)
      
      // Only try to refresh if access token is invalid but refresh token exists
      if (!userId && cookie.refresh_token && cookie.refresh_token.value) {
        console.log('Access token invalid but refresh token exists - attempting to refresh');
        // Try to refresh tokens and make sure we set proper headers
        const refreshed = jwtService.refreshAccessToken(cookie);
        if (refreshed) {
          // Make sure the Set-Cookie header is explicitly exposed
          set.headers['Access-Control-Expose-Headers'] = 'Set-Cookie';
          console.log('Headers set for cookie exposure');
        }
      }
    } catch (error) {
      // Just log errors, don't interrupt the request flow
      console.error('Auth middleware refresh error:', error)
    }
  })
