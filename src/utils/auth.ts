import { auth } from '../config/firebase'
import type { UserRecord } from 'firebase-admin/auth'

/**
 * Get the current user from a request's Authorization header
 * @param request The HTTP request object
 * @returns The user record or null if not authenticated
 */
export async function getCurrentUser(request: Request): Promise<UserRecord | null> {
  try {
    // Check if Firebase auth is initialized
    if (!auth) {
      console.error('Firebase auth is not initialized')
      return null
    }

    // Extract Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    // Extract and verify the token
    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    
    // Get the full user record
    const user = await auth.getUser(decodedToken.uid)
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Utility function to require authentication in a route
 * @param context The Elysia context with request and set objects
 * @returns The user or handles unauthorized response
 */
export async function requireAuth({ request, set }: { request: Request, set: any }): Promise<UserRecord | null> {
  const user = await getCurrentUser(request)
  
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
