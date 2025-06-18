import { UserReadingStateRepository } from '../repositories/userReadingState.repository';
import { UserReadingState } from '../models/userReadingState';
import { ModuleService } from './module.service';

export class UserReadingStateService {
  private userReadingStateRepository: UserReadingStateRepository;
  private moduleService: ModuleService;

  constructor() {
    this.userReadingStateRepository = new UserReadingStateRepository();
    this.moduleService = new ModuleService();
  }

  async updateUserModuleAccess(userId: string, moduleId: string): Promise<void> {
    // Update user reading state
    await this.userReadingStateRepository.updateUserReadingState({
      userId,
      moduleId
    });

    // Clean up old reading states to keep only the last 2
    await this.userReadingStateRepository.cleanupOldReadingStates(userId);
  }  async getLastAccessedModules(userId: string): Promise<any[]> {
    console.log(`🔍 [DEBUG] getLastAccessedModules called for userId: ${userId}`);
    
    const readingStates = await this.userReadingStateRepository.getUserLastAccessedModules(userId);
    console.log(`📚 [DEBUG] Found ${readingStates.length} reading states:`, readingStates);
    
    if (readingStates.length === 0) {
      console.log(`📭 [DEBUG] No reading states found for user ${userId}`);
      return [];
    }

    const modulesWithProgress = [];
    
    for (const readingState of readingStates) {
      try {
        console.log(`🔍 [DEBUG] Processing reading state for moduleId: ${readingState.moduleId}`);
        
        // Get module details
        const module = await this.moduleService.getModuleById(readingState.moduleId);
        console.log(`📖 [DEBUG] Module data for ${readingState.moduleId}:`, module ? 'Found' : 'Not found');
        if (!module) {
          console.log(`❌ [DEBUG] Module ${readingState.moduleId} not found, skipping`);
          continue;
        }

        // Get user progress for this module
        const progress = await this.moduleService.getUserModuleProgress(userId, readingState.moduleId);
        console.log(`📊 [DEBUG] Progress for user ${userId} on module ${readingState.moduleId}:`, progress);
        
        const moduleWithProgress = {
          id: readingState.id,
          userId: readingState.userId,
          moduleId: readingState.moduleId,
          lastAccessedAt: readingState.lastAccessedAt,
          module: {
            ...module,
            progress: progress
          }
        };
        
        console.log(`✅ [DEBUG] Successfully processed module ${readingState.moduleId}:`, {
          moduleTitle: module.title,
          moduleOrder: module.order,
          progressPercentage: progress?.completionPercentage || 0
        });
        
        modulesWithProgress.push(moduleWithProgress);
      } catch (error) {
        console.error(`❌ [ERROR] Error fetching module data for ${readingState.moduleId}:`, error);
        continue;
      }
    }
    
    console.log(`🎉 [DEBUG] Final result: ${modulesWithProgress.length} modules with progress`);
    return modulesWithProgress;
  }
}
