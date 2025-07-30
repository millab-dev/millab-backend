import { 
  Module, 
  CreateModuleData, 
  UpdateModuleData, 
  UserProgress,
  ModuleSection 
} from "../models/module";
import { moduleRepository } from "../repositories/module.repository";

export class ModuleService {
  /**
   * Create a new module (admin only)
   */
  async createModule(moduleData: CreateModuleData): Promise<Module> {
    // Validate module data
    this.validateModuleData(moduleData);
    
    return await moduleRepository.createModule(moduleData);
  }

  /**
   * Get all modules (admin only)
   */
  async getAllModules(): Promise<Module[]> {
    return await moduleRepository.getAllModules();
  }

  /**
   * Get active modules for users
   */
  async getActiveModules(): Promise<Module[]> {
    return await moduleRepository.getActiveModules();
  }  /**
   * Get modules with user progress and validate data integrity
   * If userId is not provided (public access), returns modules with null progress
   */  
  async getModulesWithProgress(userId?: string): Promise<(Module & { progress?: UserProgress | null })[]> {
    const modules = await moduleRepository.getActiveModules();
    
    // If no userId provided (public access), return modules with null progress
    if (!userId) {
      return modules.map(module => ({
        ...module,
        progress: null,
      }));
    }
    
    // Validate and get progress for each module (authenticated user)
    const modulesWithProgress = await Promise.all(
      modules.map(async (module) => {
        const progress = await moduleRepository.validateAndFixUserProgress(userId, module.id);
        return {
          ...module,
          progress,
        };
      })
    );

    return modulesWithProgress;
  }

  /**
   * Get homepage modules (order 1, 5, 11) with user progress
   * If userId is not provided (public access), returns modules with null progress
   */
  async getHomepageModules(userId?: string): Promise<(Module & { progress?: UserProgress | null })[]> {
    const modules = await moduleRepository.getActiveModules();
    
    // Filter homepage modules (you may need to adjust this logic based on your requirements)
    const homepageModules = modules; // Add your filtering logic here if needed
    
    // If no userId provided (public access), return modules with null progress
    if (!userId) {
      return homepageModules
        .map(module => ({
          ...module,
          progress: null,
        }))
        .sort((a, b) => a.order - b.order);
    }
    
    // For authenticated users, get their progress
    const userProgressList = await moduleRepository.getAllUserProgress(userId);
    
    // Create a map for quick lookup
    const progressMap = new Map<string, UserProgress>();
    userProgressList.forEach((progress: UserProgress) => {
      progressMap.set(progress.moduleId, progress);
    });
    
    // Combine modules with their progress and sort by order
    return homepageModules
      .map(module => ({
        ...module,
        progress: progressMap.get(module.id) || null,
      }))
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get module by ID
   */
  async getModuleById(id: string): Promise<Module | null> {
    return await moduleRepository.getModuleById(id);
  }
  /**
   * Get module with user progress and validate data integrity
   * If userId is not provided (public access), returns module with null progress
   */
  async getModuleWithProgress(moduleId: string, userId?: string): Promise<(Module & { progress?: UserProgress | null }) | null> {
    const module = await moduleRepository.getModuleById(moduleId);
    if (!module) return null;

    // If no userId provided (public access), return module with null progress
    if (!userId) {
      return {
        ...module,
        progress: null,
      };
    }

    // Validate and fix progress data integrity for authenticated users
    const progress = await moduleRepository.validateAndFixUserProgress(userId, moduleId);
    
    return {
      ...module,
      progress,
    };
  }

  /**
   * Update module (admin only)
   */
  async updateModule(id: string, updates: UpdateModuleData): Promise<Module> {
    const existingModule = await moduleRepository.getModuleById(id);
    if (!existingModule) {
      throw new Error("Module not found");
    }

    // Validate update data
    if (updates.sections) {
      this.validateSections(updates.sections);
    }

    return await moduleRepository.updateModule(id, updates);
  }

  /**
   * Delete module (admin only)
   */
  async deleteModule(id: string): Promise<boolean> {
    const existingModule = await moduleRepository.getModuleById(id);
    if (!existingModule) {
      throw new Error("Module not found");
    }

    return await moduleRepository.deleteModule(id);
  }

  /**
   * Mark section as completed
   */
  async markSectionCompleted(userId: string, moduleId: string, sectionId: string): Promise<UserProgress> {
    // Verify that the module and section exist
    const module = await moduleRepository.getModuleById(moduleId);
    if (!module) {
      throw new Error("Module not found");
    }

    const sectionExists = module.sections.some(section => section.id === sectionId);
    if (!sectionExists) {
      throw new Error("Section not found in module");
    }

    return await moduleRepository.markSectionCompleted(userId, moduleId, sectionId);
  }
  /**
   * Mark quiz as completed
   */
  async markQuizCompleted(userId: string, moduleId: string, score: number): Promise<UserProgress> {
    // Verify that the module exists
    const module = await moduleRepository.getModuleById(moduleId);
    if (!module) {
      throw new Error("Module not found");
    }

    // Validate score
    if (score < 0 || score > 100) {
      throw new Error("Score must be between 0 and 100");
    }

    return await moduleRepository.saveQuizResult(userId, moduleId, score);
  }
  /**
   * Get user progress for all modules
   */
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await moduleRepository.getAllUserProgress(userId);
  }

  /**
   * Get user progress for specific module
   */
  async getUserModuleProgress(userId: string, moduleId: string): Promise<UserProgress | null> {
    return await moduleRepository.getUserProgress(userId, moduleId);
  }
  /**
   * Validate module data
   */
  private validateModuleData(moduleData: CreateModuleData): void {
    if (!moduleData.title || moduleData.title.trim().length === 0) {
      throw new Error("Module title is required");
    }

    if (!moduleData.description || moduleData.description.trim().length === 0) {
      throw new Error("Module description is required");
    }

    if (!moduleData.difficulty || !['Easy', 'Intermediate', 'Advanced'].includes(moduleData.difficulty)) {
      throw new Error("Module difficulty must be Easy, Intermediate, or Advanced");
    }

    if (moduleData.order < 0) {
      throw new Error("Module order must be a positive number");
    }

    if (!moduleData.sections || moduleData.sections.length === 0) {
      throw new Error("Module must have at least one section");
    }

    this.validateSections(moduleData.sections);

    if (!moduleData.quiz) {
      throw new Error("Module must have a quiz");
    }

    this.validateQuiz(moduleData.quiz);
  }

  /**
   * Validate sections
   */
  private validateSections(sections: any[]): void {
    sections.forEach((section, index) => {
      if (!section.title || section.title.trim().length === 0) {
        throw new Error(`Section ${index + 1}: Title is required`);
      }

      if (!section.content || section.content.trim().length === 0) {
        throw new Error(`Section ${index + 1}: Content is required`);
      }

      if (!section.duration || section.duration.trim().length === 0) {
        throw new Error(`Section ${index + 1}: Duration is required`);
      }

      if (section.order < 0) {
        throw new Error(`Section ${index + 1}: Order must be a positive number`);
      }
    });
  }

  /**
   * Validate quiz
   */
  private validateQuiz(quiz: any): void {
    if (!quiz.title || quiz.title.trim().length === 0) {
      throw new Error("Quiz title is required");
    }

    if (!quiz.description || quiz.description.trim().length === 0) {
      throw new Error("Quiz description is required");
    }

    if (!quiz.duration || quiz.duration.trim().length === 0) {
      throw new Error("Quiz duration is required");
    }    if (quiz.totalQuestions <= 0) {
      throw new Error("Quiz must have at least one question");
    }
  }
}

// Export a singleton instance
export const moduleService = new ModuleService();
