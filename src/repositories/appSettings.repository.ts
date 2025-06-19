import { db } from '../config/firebase';
import { AppSettings, UpdateAppSettingsData } from '../models/appSettings';

export class AppSettingsRepository {
  private collection = 'app_settings';
  private settingsDocId = 'global_settings'; // Single document for global settings

  /**
   * Get application settings
   */
  async getSettings(): Promise<AppSettings | null> {
    try {
      if (!db) {
        console.error('Firebase Firestore is not initialized');
        return null;
      }

      const doc = await db.collection(this.collection).doc(this.settingsDocId).get();
      
      if (!doc.exists) {
        // Create default settings if they don't exist
        return this.createDefaultSettings();
      }

      return { id: doc.id, ...doc.data() } as AppSettings;
    } catch (error) {
      console.error('Error getting app settings:', error);
      return null;
    }
  }

  /**
   * Update application settings
   */
  async updateSettings(settingsData: UpdateAppSettingsData): Promise<AppSettings | null> {
    try {
      if (!db) {
        console.error('Firebase Firestore is not initialized');
        return null;
      }

      const now = new Date().toISOString();
      const updateData = {
        ...settingsData,
        updatedAt: now,
      };

      // Check if settings document exists
      const doc = await db.collection(this.collection).doc(this.settingsDocId).get();
      
      if (!doc.exists) {
        // Create new settings document
        const newSettings = {
          ...updateData,
          createdAt: now,
        };
        await db.collection(this.collection).doc(this.settingsDocId).set(newSettings);
        
        return {
          id: this.settingsDocId,
          ...newSettings,
        } as AppSettings;
      } else {
        // Update existing settings
        await db.collection(this.collection).doc(this.settingsDocId).update(updateData);
        
        // Return updated settings
        return this.getSettings();
      }
    } catch (error) {
      console.error('Error updating app settings:', error);
      return null;
    }
  }
  /**
   * Create default settings
   */
  private async createDefaultSettings(): Promise<AppSettings> {
    if (!db) {
      throw new Error('Firebase Firestore is not initialized');
    }

    const now = new Date().toISOString();
    const defaultSettings = {
      downloadAllPdfUrl: '',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(this.collection).doc(this.settingsDocId).set(defaultSettings);

    return {
      id: this.settingsDocId,
      ...defaultSettings,
    } as AppSettings;
  }
}

// Export singleton instance
export const appSettingsRepository = new AppSettingsRepository();
