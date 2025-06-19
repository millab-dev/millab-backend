import { AppSettingsRepository } from '../repositories/appSettings.repository';
import { AppSettings, UpdateAppSettingsData } from '../models/appSettings';

export class AppSettingsService {
  private appSettingsRepository: AppSettingsRepository;

  constructor() {
    this.appSettingsRepository = new AppSettingsRepository();
  }

  /**
   * Get application settings
   */
  async getSettings(): Promise<AppSettings | null> {
    try {
      return await this.appSettingsRepository.getSettings();
    } catch (error) {
      console.error('Error in AppSettingsService.getSettings:', error);
      return null;
    }
  }

  /**
   * Update application settings
   */
  async updateSettings(settingsData: UpdateAppSettingsData): Promise<AppSettings | null> {
    try {
      // Validate PDF URL if provided
      if (settingsData.downloadAllPdfUrl && settingsData.downloadAllPdfUrl.trim()) {
        const urlPattern = /^https?:\/\/.+\.(pdf)$/i;
        if (!urlPattern.test(settingsData.downloadAllPdfUrl.trim())) {
          throw new Error('Download All PDF URL must be a valid PDF URL');
        }
      }

      return await this.appSettingsRepository.updateSettings(settingsData);
    } catch (error) {
      console.error('Error in AppSettingsService.updateSettings:', error);
      throw error;
    }
  }

  /**
   * Get download all PDF URL
   */
  async getDownloadAllPdfUrl(): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      return settings?.downloadAllPdfUrl || null;
    } catch (error) {
      console.error('Error getting download all PDF URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const appSettingsService = new AppSettingsService();
