/**
 * User Reading State model for tracking the last accessed modules
 */
export interface UserReadingState {
  id: string;
  userId: string;
  moduleId: string;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create user reading state data
 */
export interface CreateUserReadingStateData {
  userId: string;
  moduleId: string;
}

/**
 * Update user reading state data
 */
export interface UpdateUserReadingStateData {
  lastAccessedAt: string;
}
