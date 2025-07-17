import { Elysia, t } from 'elysia';
import { appSettingsService } from '../../../services/appSettings.service';
import { requireAdmin } from '../../../middlewares/admin.middleware';
import { ApiResponse } from '../../../interface';

export const appSettingsRoutes = new Elysia({ prefix: '/settings' })
  
  // Get application settings (admin only)
  .use(requireAdmin)
  .get('/admin', async ({ set }) => {
    try {
      const settings = await appSettingsService.getSettings();
      
      const response: ApiResponse<any> = {
        success: true,
        data: settings
      };

      return response;
    } catch (error) {
      console.error('Error fetching app settings:', error);
      set.status = 500;
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch application settings'
      };
      return response;
    }
  })

  // Update application settings (admin only)
  .put('/admin', async ({ body, set }) => {
    try {
      const settings = await appSettingsService.updateSettings(body);
      
      if (!settings) {
        set.status = 500;
        const response: ApiResponse<null> = {
          success: false,
          error: 'Failed to update application settings'
        };
        return response;
      }

      const response: ApiResponse<any> = {
        success: true,
        message: 'Application settings updated successfully',
        data: settings
      };

      return response;
    } catch (error) {
      console.error('Error updating app settings:', error);
      set.status = 400;
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update application settings'
      };
      return response;
    }
  }, {
    body: t.Object({
      downloadAllPdfUrl: t.Optional(t.String()),
      downloadAllPdfUrlEn: t.Optional(t.String())
    })
  })

  // Get download all URL (public for authenticated users)
  .get('/download-all-pdf-url', async ({ set, query }) => {
    try {
      const language = query.lang as 'id' | 'en' || 'id';
      const pdfUrl = await appSettingsService.getDownloadAllUrl(language);
      
      const response: ApiResponse<any> = {
        success: true,
        data: { downloadAllPdfUrl: pdfUrl }
      };

      return response;
    } catch (error) {
      console.error('Error fetching download all URL:', error);
      set.status = 500;
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch download all URL'
      };
      return response;
    }
  });
