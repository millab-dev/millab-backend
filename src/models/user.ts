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
  photoURL?: string
  createdAt: string
  updatedAt: string
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
  photoURL?: string
  password: string // Password is included here but not in the User model
}
