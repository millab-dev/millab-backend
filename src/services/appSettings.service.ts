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
      // Validate URLs if provided (removed PDF constraint - can be any link)
      if (settingsData.downloadAllPdfUrl && settingsData.downloadAllPdfUrl.trim()) {
        const urlPattern = /^https?:\/\/.+$/i;
        if (!urlPattern.test(settingsData.downloadAllPdfUrl.trim())) {
          throw new Error('Download All URL (Indonesian) must be a valid URL');
        }
      }

      if (settingsData.downloadAllPdfUrlEn && settingsData.downloadAllPdfUrlEn.trim()) {
        const urlPattern = /^https?:\/\/.+$/i;
        if (!urlPattern.test(settingsData.downloadAllPdfUrlEn.trim())) {
          throw new Error('Download All URL (English) must be a valid URL');
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

  /**
   * Get download all URL based on language
   */
  async getDownloadAllUrl(language: 'id' | 'en' = 'id'): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      if (language === 'en') {
        return settings?.downloadAllPdfUrlEn || settings?.downloadAllPdfUrl || null;
      }
      return settings?.downloadAllPdfUrl || null;
    } catch (error) {
      console.error('Error getting download all URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const appSettingsService = new AppSettingsService();
