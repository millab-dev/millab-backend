/**
 * Application settings model
 */
export interface AppSettings {
  id: string;
  downloadAllPdfUrl?: string; // URL for "Download All" functionality (Indonesian)
  downloadAllPdfUrlEn?: string; // URL for "Download All" functionality (English)
  createdAt: string;
  updatedAt: string;
}

/**
 * Create/Update app settings data
 */
export interface UpdateAppSettingsData {
  downloadAllPdfUrl?: string;
  downloadAllPdfUrlEn?: string;
}
