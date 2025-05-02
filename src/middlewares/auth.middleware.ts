import { Elysia } from 'elysia'
import { jwtService } from '../services/jwt.service'

/**
 * Authentication middleware for Elysia.js
 * Automatically handles token refresh if needed
 * Super minimal - just refreshes tokens, nothing else
 */
export const authMiddleware = new Elysia()
  // Hook to run before all requests
  .onBeforeHandle(({ request, cookie }) => {
    try {
      // Check if access token is valid
      const userId = jwtService.getUserIdFromCookies(request)
      
      // Only try to refresh if access token is invalid but refresh token exists
      if (!userId && cookie.refresh_token && cookie.refresh_token.value) {
        // Just try to refresh silently
        jwtService.refreshAccessToken(cookie)
      }
    } catch (error) {
      // Just log errors, don't interrupt the request flow
      console.error('Auth middleware refresh error:', error)
    }
  })
