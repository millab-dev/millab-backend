import { auth, db } from '../config/firebase'
import { User, CreateUserData } from '../models/user'

// Error messages
const AUTH_NOT_INITIALIZED = 'Firebase Auth is not initialized'
const DB_NOT_INITIALIZED = 'Firebase Firestore is not initialized'

/**
 * User repository class for handling user data operations
 */
export class UserRepository {
  private readonly collection = 'users'
  
  /**
   * Create a new user with Firebase Authentication and Firestore
   */
  async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      // Check if Firebase Auth is initialized
      if (!auth) {
        console.error(AUTH_NOT_INITIALIZED)
        return null
      }
      
      // Check if Firestore is initialized
      if (!db) {
        console.error(DB_NOT_INITIALIZED)
        return null
      }
      
      // 1. Create user in Firebase Authentication
      const userCredential = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
      })
        // 2. Create user document in Firestore
      const userId = userCredential.uid
      const timestamp = new Date().toISOString()
      
      // Prepare user data without password
      const userDoc: User = {
        id: userId,
        name: userData.name,
        username: userData.username,
        gender: userData.gender,
        birthplace: userData.birthplace,
        birthdate: userData.birthdate,
        socializationLocation: userData.socializationLocation,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      
      // Save to Firestore
      await db.collection(this.collection).doc(userId).set(userDoc)
      
      return userDoc
    } catch (error) {
      console.error('Error creating user:', error)
      return null
    }
  }

  /**
   * Create a new user with a specific ID (for Google Sign-In)
   */
  async createUserWithId(userId: string, userData: CreateUserData): Promise<User | null> {
    try {
      // Check if Firestore is initialized
      if (!db) {
        console.error(DB_NOT_INITIALIZED)
        return null
      }
        const timestamp = new Date().toISOString()
      
      // Prepare user data without password
      const userDoc: User = {
        id: userId,
        name: userData.name,
        username: userData.username,
        gender: userData.gender,
        birthplace: userData.birthplace,
        birthdate: userData.birthdate,
        socializationLocation: userData.socializationLocation,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      
      // Save to Firestore with the specific ID
      await db.collection(this.collection).doc(userId).set(userDoc)
      
      return userDoc
    } catch (error) {
      console.error('Error creating user with ID:', error)
      return null
    }
  }
  
  /**
   * Get a user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      // Check if Firestore is initialized
      if (!db) {
        console.error(DB_NOT_INITIALIZED)
        return null
      }
      
      const doc = await db.collection(this.collection).doc(userId).get()
      
      if (!doc.exists) {
        return null
      }
      
      return { id: doc.id, ...doc.data() } as User
    } catch (error) {
      console.error('Error getting user by ID:', error)
      return null
    }
  }
  
  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Check if Firestore is initialized
      if (!db) {
        console.error(DB_NOT_INITIALIZED)
        return null
      }
      
      const snapshot = await db.collection(this.collection)
        .where('email', '==', email)
        .limit(1)
        .get()
      
      if (snapshot.empty) {
        return null
      }
      
      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() } as User
    } catch (error) {      console.error('Error getting user by email:', error)
      return null
    }
  }
  
  /**
   * Get a user by name
   */
  async getUserByName(name: string): Promise<User | null> {
    try {
      // Check if Firestore is initialized
      if (!db) {
        console.error(DB_NOT_INITIALIZED)
        return null
      }
      
      const snapshot = await db
        .collection(this.collection)
        .where('name', '==', name)
        .limit(1)
        .get()
      
      if (snapshot.empty) {
        return null
      }
      
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data()
      } as User
    } catch (error) {
      console.error('Error getting user by name:', error)
      return null
    }
  }
  
  
    /**
   * Update a user
   */
  async updateUser(userId: string, userData: Partial<User>): Promise<User | null> {
    try {
      // Check if Firestore is initialized
      if (!db) {
        console.error(DB_NOT_INITIALIZED)
        return null
      }
      
      // Don't allow updating the ID
      const { id, ...updateData } = userData
      
      // Add updatedAt timestamp
      const dataToUpdate = {
        ...updateData,
        updatedAt: new Date().toISOString()
      }
      
      console.log('=== UPDATING USER ===');
      console.log('userId:', userId);
      console.log('dataToUpdate:', JSON.stringify(dataToUpdate, null, 2));
      
      await db.collection(this.collection).doc(userId).update(dataToUpdate)
      
      console.log('Firebase update successful, fetching updated user...');
      
      // Return the updated user
      const updatedUser = await this.getUserById(userId);
      console.log('Updated user fetched:', updatedUser ? 'success' : 'failed');
      return updatedUser;
    } catch (error) {
      console.error('=== ERROR UPDATING USER ===');
      console.error('userId:', userId);
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error code:', (error as any)?.code);
      return null
    }
  }
}

// Export a singleton instance
export const userRepository = new UserRepository()
