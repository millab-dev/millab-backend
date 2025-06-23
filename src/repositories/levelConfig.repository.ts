import { db } from '../config/firebase';
import { LevelConfig, PointsConfig, DEFAULT_LEVELS, DEFAULT_POINTS_CONFIG } from '../models/levelConfig';

/**
 * Level Configuration Repository
 */
export class LevelConfigRepository {
  private readonly levelCollection = 'levelConfigs';
  private readonly pointsCollection = 'pointsConfigs';

  /**
   * Initialize default configurations if they don't exist
   */
  async initializeDefaults(): Promise<void> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return;
      }      // Check if level configs exist
      const levelSnapshot = await db!.collection(this.levelCollection).limit(1).get();
      if (levelSnapshot.empty) {
        // Create default level configs
        const timestamp = new Date().toISOString();
        const batch = db!.batch();        DEFAULT_LEVELS.forEach((level, index) => {
          const docRef = db!.collection(this.levelCollection).doc();
          const levelConfig: LevelConfig = {
            ...level,
            id: docRef.id,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          batch.set(docRef, levelConfig);
        });

        await batch.commit();
        console.log('Default level configurations created');
      }      // Check if points config exists
      const pointsSnapshot = await db!.collection(this.pointsCollection).limit(1).get();
      if (pointsSnapshot.empty) {        // Create default points config
        const timestamp = new Date().toISOString();
        const docRef = db!.collection(this.pointsCollection).doc();
        const pointsConfig: PointsConfig = {
          ...DEFAULT_POINTS_CONFIG,
          id: docRef.id,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await docRef.set(pointsConfig);
        console.log('Default points configuration created');
      } else {
        // Run migration to handle old structure
        await this.migratePointsConfig();
      }
    } catch (error) {
      console.error('Error initializing default configurations:', error);
    }
  }

  /**
   * Get all level configurations
   */
  async getAllLevels(): Promise<LevelConfig[]> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return [];
      }      const snapshot = await db!.collection(this.levelCollection)
        .where('isActive', '==', true)
        .orderBy('level', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LevelConfig[];
    } catch (error) {
      console.error('Error getting level configurations:', error);
      return [];
    }
  }

  /**
   * Get points configuration
   */
  async getPointsConfig(): Promise<PointsConfig | null> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return null;
      }

      const snapshot = await db!.collection(this.pointsCollection).limit(1).get();
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as PointsConfig;
    } catch (error) {
      console.error('Error getting points configuration:', error);
      return null;
    }
  }

  /**
   * Update level configuration
   */
  async updateLevel(levelId: string, updateData: Partial<Omit<LevelConfig, 'id' | 'createdAt'>>): Promise<LevelConfig | null> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return null;
      }

      const docRef = db!.collection(this.levelCollection).doc(levelId);
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await docRef.update(updatePayload);
      
      const updatedDoc = await docRef.get();
      if (!updatedDoc.exists) {
        return null;
      }

      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as LevelConfig;
    } catch (error) {
      console.error('Error updating level configuration:', error);
      return null;
    }
  }

  /**
   * Update points configuration
   */
  async updatePointsConfig(configId: string, updateData: Partial<Omit<PointsConfig, 'id' | 'createdAt'>>): Promise<PointsConfig | null> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return null;
      }

      const docRef = db!.collection(this.pointsCollection).doc(configId);
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await docRef.update(updatePayload);
      
      const updatedDoc = await docRef.get();
      if (!updatedDoc.exists) {
        return null;
      }

      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as PointsConfig;
    } catch (error) {
      console.error('Error updating points configuration:', error);
      return null;
    }
  }

  /**
   * Create new level configuration
   */
  async createLevel(levelData: Omit<LevelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<LevelConfig | null> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return null;
      }

      const timestamp = new Date().toISOString();
      const docRef = db!.collection(this.levelCollection).doc();
      const levelConfig: LevelConfig = {
        ...levelData,
        id: docRef.id,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await docRef.set(levelConfig);
      return levelConfig;
    } catch (error) {
      console.error('Error creating level configuration:', error);
      return null;
    }
  }

  /**
   * Delete level configuration
   */
  async deleteLevel(levelId: string): Promise<boolean> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return false;
      }

      await db!.collection(this.levelCollection).doc(levelId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting level configuration:', error);
      return false;
    }
  }

  /**
   * Get user level based on points
   */
  async getUserLevel(totalPoints: number): Promise<{ level: number; title: string; minPoints: number; nextLevel?: { level: number; title: string; minPoints: number } }> {
    try {
      const levels = await this.getAllLevels();
      if (levels.length === 0) {
        return { level: 1, title: 'Beginner', minPoints: 0 };
      }

      // Find the highest level the user qualifies for
      let currentLevel = levels[0];
      for (const level of levels) {
        if (totalPoints >= level.minPoints) {
          currentLevel = level;
        } else {
          break;
        }
      }

      // Find next level
      const nextLevel = levels.find(level => level.level > currentLevel.level);

      return {
        level: currentLevel.level,
        title: currentLevel.title,
        minPoints: currentLevel.minPoints,
        nextLevel: nextLevel ? {
          level: nextLevel.level,
          title: nextLevel.title,
          minPoints: nextLevel.minPoints
        } : undefined
      };
    } catch (error) {
      console.error('Error getting user level:', error);
      return { level: 1, title: 'Beginner', minPoints: 0 };
    }
  }

  /**
   * Migrate existing points configuration to new structure
   */
  async migratePointsConfig(): Promise<void> {
    try {
      if (!db) {
        console.error('Firestore is not initialized');
        return;
      }

      const snapshot = await db!.collection(this.pointsCollection).get();
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Check if finalQuizPoints is a number (old structure)
        if (typeof data.finalQuizPoints === 'number') {
          const oldValue = data.finalQuizPoints;
          
          // Update to new structure
          await doc.ref.update({
            finalQuizPoints: {
              easy: oldValue,
              intermediate: oldValue + 1,
              advanced: oldValue + 2
            }
          });
          
          console.log(`Migrated points config ${doc.id} from old structure`);
        }
      }
    } catch (error) {
      console.error('Error migrating points configuration:', error);
    }
  }
}

// Export singleton instance
export const levelConfigRepository = new LevelConfigRepository();
