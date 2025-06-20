import { Elysia, t } from 'elysia';
import { UserReadingStateService } from '../../../services/userReadingState.service';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { jwtService } from '../../../services/jwt.service';

const userReadingStateService = new UserReadingStateService();

export const readingStateRoutes = new Elysia({ prefix: '/reading-state' })
  .use(authMiddleware)
  
  // Update user module access (when user accesses a module)
  .post('/access/:moduleId', async ({ params: { moduleId }, request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      await userReadingStateService.updateUserModuleAccess(userId, moduleId);
      
      return {
        success: true,
        message: 'Module access updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating module access:', error);
      return {
        success: false,
        error: error.message || 'Failed to update module access'
      };
    }
  }, {
    params: t.Object({
      moduleId: t.String()
    })
  })
    // Get user's last accessed modules
  .get('/last-accessed', async ({ request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      console.log(`🔐 [DEBUG] /last-accessed endpoint called, userId: ${userId}`);
      
      if (!userId) {
        console.log(`❌ [DEBUG] No userId found in cookies`);
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      console.log(`📡 [DEBUG] Calling userReadingStateService.getLastAccessedModules for userId: ${userId}`);
      const lastAccessedModules = await userReadingStateService.getLastAccessedModules(userId);
      
      console.log(`📋 [DEBUG] Service returned ${lastAccessedModules.length} modules`);
      console.log(`📄 [DEBUG] Response data:`, JSON.stringify(lastAccessedModules, null, 2));
      
      return {
        success: true,
        data: lastAccessedModules
      };
    } catch (error: any) {
      console.error('❌ [ERROR] Error fetching last accessed modules:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch last accessed modules'
      };
    }
  });
