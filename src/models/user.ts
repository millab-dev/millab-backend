/**
 * User model that matches the registration form fields
 */
export interface User {
  id: string
  name: string
  username: string
  gender: 'Male' | 'Female'
  birthplace: string
  birthdate: string
  socializationLocation: string
  email: string
  phoneNumber?: string // Make phone number optional
  isAdmin?: boolean // Admin flag - only true for admin users
  // Fields for progression system (points-based)
  dayStreak?: number
  lastActiveDate?: string // ISO date string for tracking day streaks
  pointsHistory?: PointsGainRecord[] // Track where points came from
  // Legacy fields (kept for backward compatibility, but deprecated)
  currentExp?: number
  level?: number
  expHistory?: ExpGainRecord[] // Track where XP came from
  createdAt: string
  updatedAt: string
}

/**
 * Record of XP gains for tracking purposes
 */
export interface ExpGainRecord {
  source: 'section_read' | 'quiz_attempt' | 'final_quiz'
  sourceId: string // section ID, quiz ID, etc.
  expGained: number
  timestamp: string
  attemptNumber?: number // For quizzes, track attempt number
}

/**
 * Record of points gains for tracking purposes
 */
export interface PointsGainRecord {
  source: 'module_quiz' | 'final_quiz' | 'section_read'
  sourceId: string // quiz ID, final quiz ID, section ID, etc.
  pointsGained: number
  timestamp: string
  difficulty?: 'Easy' | 'Intermediate' | 'Advanced' // For module quizzes and sections
}

/**
 * User creation data (omits auto-generated fields)
 */
export interface CreateUserData {
  name: string
  username: string
  gender: 'Male' | 'Female'
  birthplace: string
  birthdate: string
  socializationLocation: string
  email: string
  phoneNumber?: string // Make phone number optional
  password: string // Password is included here but not in the User model
}
