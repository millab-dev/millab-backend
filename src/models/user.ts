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
  phoneNumber: string
  isAdmin?: boolean // Admin flag - only true for admin users
  // New fields for XP and progression system
  currentExp?: number
  level?: number
  dayStreak?: number
  lastActiveDate?: string // ISO date string for tracking day streaks
  expHistory?: ExpGainRecord[] // Track where XP came from
  pointsHistory?: PointsGainRecord[] // Track where points came from
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
  source: 'module_quiz' | 'final_quiz'
  sourceId: string // quiz ID, final quiz ID, etc.
  pointsGained: number
  timestamp: string
  difficulty?: 'Easy' | 'Intermediate' | 'Advanced' // For module quizzes
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
  phoneNumber: string
  password: string // Password is included here but not in the User model
}
