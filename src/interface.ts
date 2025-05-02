/**
 * Payload stored in JWT tokens
 */
export interface JwtPayload {
  userId: string
  tokenType?: 'access' | 'refresh'
  [key: string]: any
}

// Payload type for token generation
export interface TokenPayload {
    userId: string;
    tokenType: 'access' | 'refresh';
}

/**
 * HTTP response structure
 */
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}