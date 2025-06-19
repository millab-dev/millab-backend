/**
 * Application settings model
 */
export interface AppSettings {
  id: string;
  downloadAllPdfUrl?: string; // URL for "Download All" PDF functionality
  createdAt: string;
  updatedAt: string;
}

/**
 * Create/Update app settings data
 */
export interface UpdateAppSettingsData {
  downloadAllPdfUrl?: string;
}
