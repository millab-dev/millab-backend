import { levelConfigRepository } from "../repositories/levelConfig.repository";
import { LevelConfig, PointsConfig } from "../models/levelConfig";
import { ApiResponse } from "../interface";

export class LevelConfigService {
  /**
   * Initialize default configurations
   */
  async initializeDefaults(): Promise<void> {
    await levelConfigRepository.initializeDefaults();
  }

  /**
   * Get all level configurations
   */
  async getAllLevels(): Promise<ApiResponse<LevelConfig[]>> {
    try {
      const levels = await levelConfigRepository.getAllLevels();
      return {
        success: true,
        data: levels
      };
    } catch (error) {
      console.error('Error getting level configurations:', error);
      return {
        success: false,
        error: 'Failed to fetch level configurations'
      };
    }
  }

  /**
   * Get points configuration
   */
  async getPointsConfig(): Promise<ApiResponse<PointsConfig>> {
    try {
      const config = await levelConfigRepository.getPointsConfig();
      if (!config) {
        return {
          success: false,
          error: 'Points configuration not found'
        };
      }
      return {
        success: true,
        data: config
      };
    } catch (error) {
      console.error('Error getting points configuration:', error);
      return {
        success: false,
        error: 'Failed to fetch points configuration'
      };
    }
  }

  /**
   * Update level configuration
   */
  async updateLevel(
    levelId: string, 
    updateData: Partial<Omit<LevelConfig, 'id' | 'createdAt'>>
  ): Promise<ApiResponse<LevelConfig>> {
    try {
      // Validate minPoints if being updated
      if (updateData.minPoints !== undefined && updateData.minPoints < 0) {
        return {
          success: false,
          error: 'Minimum points cannot be negative'
        };
      }

      // Check for duplicate level numbers
      if (updateData.level !== undefined) {
        const allLevels = await levelConfigRepository.getAllLevels();
        const existingLevel = allLevels.find(l => l.level === updateData.level && l.id !== levelId);
        if (existingLevel) {
          return {
            success: false,
            error: 'Level number already exists'
          };
        }
      }

      const updatedLevel = await levelConfigRepository.updateLevel(levelId, updateData);
      if (!updatedLevel) {
        return {
          success: false,
          error: 'Failed to update level configuration'
        };
      }

      return {
        success: true,
        data: updatedLevel,
        message: 'Level configuration updated successfully'
      };
    } catch (error) {
      console.error('Error updating level configuration:', error);
      return {
        success: false,
        error: 'Failed to update level configuration'
      };
    }
  }

  /**
   * Update points configuration
   */
  async updatePointsConfig(
    configId: string,
    updateData: Partial<Omit<PointsConfig, 'id' | 'createdAt'>>
  ): Promise<ApiResponse<PointsConfig>> {
    try {
      // Validate point values
      if (updateData.sectionPoints) {
        const { easy, intermediate, advanced } = updateData.sectionPoints;
        if (easy < 0 || intermediate < 0 || advanced < 0) {
          return {
            success: false,
            error: 'Points values cannot be negative'
          };
        }
      }

      if (updateData.quizPoints) {
        const { easy, intermediate, advanced } = updateData.quizPoints;
        if (easy < 0 || intermediate < 0 || advanced < 0) {
          return {
            success: false,
            error: 'Points values cannot be negative'
          };
        }
      }      if (updateData.finalQuizPoints !== undefined) {
        if (updateData.finalQuizPoints.easy < 0 || 
            updateData.finalQuizPoints.intermediate < 0 || 
            updateData.finalQuizPoints.advanced < 0) {
          return {
            success: false,
            error: 'Final quiz points cannot be negative'
          };
        }
      }

      const updatedConfig = await levelConfigRepository.updatePointsConfig(configId, updateData);
      if (!updatedConfig) {
        return {
          success: false,
          error: 'Failed to update points configuration'
        };
      }

      return {
        success: true,
        data: updatedConfig,
        message: 'Points configuration updated successfully'
      };
    } catch (error) {
      console.error('Error updating points configuration:', error);
      return {
        success: false,
        error: 'Failed to update points configuration'
      };
    }
  }

  /**
   * Create new level configuration
   */
  async createLevel(levelData: Omit<LevelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<LevelConfig>> {
    try {
      // Validate level data
      if (levelData.minPoints < 0) {
        return {
          success: false,
          error: 'Minimum points cannot be negative'
        };
      }

      // Check for duplicate level numbers
      const allLevels = await levelConfigRepository.getAllLevels();
      const existingLevel = allLevels.find(l => l.level === levelData.level);
      if (existingLevel) {
        return {
          success: false,
          error: 'Level number already exists'
        };
      }

      const newLevel = await levelConfigRepository.createLevel(levelData);
      if (!newLevel) {
        return {
          success: false,
          error: 'Failed to create level configuration'
        };
      }

      return {
        success: true,
        data: newLevel,
        message: 'Level configuration created successfully'
      };
    } catch (error) {
      console.error('Error creating level configuration:', error);
      return {
        success: false,
        error: 'Failed to create level configuration'
      };
    }
  }

  /**
   * Delete level configuration
   */
  async deleteLevel(levelId: string): Promise<ApiResponse<null>> {
    try {
      const success = await levelConfigRepository.deleteLevel(levelId);
      if (!success) {
        return {
          success: false,
          error: 'Failed to delete level configuration'
        };
      }

      return {
        success: true,
        data: null,
        message: 'Level configuration deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting level configuration:', error);
      return {
        success: false,
        error: 'Failed to delete level configuration'
      };
    }
  }
}

// Export singleton instance
export const levelConfigService = new LevelConfigService();
