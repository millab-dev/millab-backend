import { db } from "../config/firebase";
import {
  UserReadingState,
  CreateUserReadingStateData,
  UpdateUserReadingStateData,
} from "../models/userReadingState";

export class UserReadingStateRepository {
  private collection;

  constructor() {
    if (!db) {
      throw new Error('Firebase Firestore is not initialized');
    }
    this.collection = db.collection("userReadingStates");
  }
  /**
   * Get last accessed modules for a user (max 2)
   */
  async getUserLastAccessedModules(userId: string): Promise<UserReadingState[]> {
    try {
      console.log(`🔍 [DEBUG] getUserLastAccessedModules called for userId: ${userId}`);
      
      const snapshot = await this.collection
        .where("userId", "==", userId)
        .orderBy("lastAccessedAt", "desc")
        .limit(2)
        .get();

      console.log(`📊 [DEBUG] Database query returned ${snapshot.docs.length} documents`);

      const readingStates: UserReadingState[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 [DEBUG] Document ${doc.id}:`, data);
        
        readingStates.push({
          id: doc.id,
          ...data,
        } as UserReadingState);
      });

      console.log(`✅ [DEBUG] Returning ${readingStates.length} reading states:`, readingStates);
      return readingStates;
    } catch (error) {
      console.error("❌ [ERROR] Error getting user last accessed modules:", error);
      throw error;
    }
  }

  /**
   * Update or create user reading state
   */
  async updateUserReadingState(
    data: CreateUserReadingStateData
  ): Promise<UserReadingState> {
    try {
      // Check if user already has a reading state for this module
      const existingSnapshot = await this.collection
        .where("userId", "==", data.userId)
        .where("moduleId", "==", data.moduleId)
        .get();

      const now = new Date().toISOString();      if (!existingSnapshot.empty) {
        // Update existing reading state
        const doc = existingSnapshot.docs[0];
        
        const updateData = {
          lastAccessedAt: now,
          updatedAt: now,
        };

        await doc.ref.update(updateData);

        return {
          id: doc.id,
          ...doc.data(),
          ...updateData,
        } as UserReadingState;
      } else {
        // Create new reading state
        const newReadingState = {
          ...data,
          lastAccessedAt: now,
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await this.collection.add(newReadingState);

        return {
          id: docRef.id,
          ...newReadingState,
        };
      }
    } catch (error) {
      console.error("Error updating user reading state:", error);
      throw error;
    }
  }

  /**
   * Clean up old reading states (keep only last 2 per user)
   */
  async cleanupOldReadingStates(userId: string): Promise<void> {
    try {
      const snapshot = await this.collection
        .where("userId", "==", userId)
        .orderBy("lastAccessedAt", "desc")
        .get();

      const docs = snapshot.docs;
        // If user has more than 2 reading states, delete the oldest ones
      if (docs.length > 2) {
        const docsToDelete = docs.slice(2); // Keep first 2, delete the rest
        
        if (!db) {
          throw new Error('Firebase Firestore is not initialized');
        }
        const batch = db.batch();
        docsToDelete.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
      }
    } catch (error) {
      console.error("Error cleaning up old reading states:", error);
      throw error;
    }
  }
}

export const userReadingStateRepository = new UserReadingStateRepository();
