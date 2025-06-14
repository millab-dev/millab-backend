import { db } from "../config/firebase";
import { 
  Timestamp 
} from "firebase-admin/firestore";
import { 
  Module, 
  CreateModuleData, 
  UpdateModuleData,
  UpdateModuleSectionData,
  UpdateModuleQuizData,
  UserProgress 
} from "../models/module";

export class ModuleRepository {
  private collection = "modules";
  private progressCollection = "user_progress";
  /**
   * Create a new module
   */
  async createModule(moduleData: CreateModuleData): Promise<Module> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const now = Timestamp.now().toDate().toISOString();
    
    // Add sections with generated IDs
    const sectionsWithIds = moduleData.sections.map((section, index) => ({
      id: `section_${Date.now()}_${index}`,
      ...section,
      createdAt: now,
      updatedAt: now,
    }));

    // Add quiz questions with generated IDs
    const questionsWithIds = moduleData.quiz.questions.map((question, index) => ({
      id: `question_${Date.now()}_${index}`,
      ...question,
    }));

    // Add quiz with generated ID and questions
    const quizWithId = {
      id: `quiz_${Date.now()}`,
      ...moduleData.quiz,
      questions: questionsWithIds,
      createdAt: now,
      updatedAt: now,
    };

    const moduleDoc = {
      ...moduleData,
      sections: sectionsWithIds,
      quiz: quizWithId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(this.collection).add(moduleDoc);
    
    return {
      id: docRef.id,
      ...moduleDoc,
    } as Module;
  }

  /**
   * Get all modules
   */
  async getAllModules(): Promise<Module[]> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const querySnapshot = await db
      .collection(this.collection)
      .orderBy("order", "asc")
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Module[];
  }

  /**
   * Get active modules only
   */
  async getActiveModules(): Promise<Module[]> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const querySnapshot = await db
      .collection(this.collection)
      .where("isActive", "==", true)
      .orderBy("order", "asc")
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Module[];
  }

  /**
   * Get module by ID
   */
  async getModuleById(id: string): Promise<Module | null> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const docSnap = await db.collection(this.collection).doc(id).get();
    
    if (!docSnap.exists) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Module;
  }  /**
   * Update module
   */
  async updateModule(id: string, updateData: UpdateModuleData): Promise<Module> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const now = Timestamp.now().toDate().toISOString();
    const docRef = db.collection(this.collection).doc(id);
    
    // Process update data to add IDs to new sections and quiz questions if needed
    const processedUpdateData = { ...updateData };
    
    if (updateData.sections) {
      processedUpdateData.sections = updateData.sections.map((section, index) => ({
        ...section,
        id: section.id || `section_${Date.now()}_${index}`,
        createdAt: section.createdAt || now,
        updatedAt: now,
      }));
    }

    if (updateData.quiz && updateData.quiz.questions) {
      const questionsWithIds = updateData.quiz.questions.map((question, index) => ({
        ...question,
        id: question.id || `question_${Date.now()}_${index}`,
      }));
      
      processedUpdateData.quiz = {
        ...updateData.quiz,
        id: updateData.quiz.id || `quiz_${Date.now()}`,
        questions: questionsWithIds,
        createdAt: updateData.quiz.createdAt || now,
        updatedAt: now,
      };
    }
    
    await docRef.update({
      ...processedUpdateData,
      updatedAt: now,
    });

    const updatedDoc = await docRef.get();
    
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as Module;
  }

  /**
   * Delete module
   */
  async deleteModule(id: string): Promise<boolean> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      await db.collection(this.collection).doc(id).delete();
      return true;
    } catch (error) {
      console.error("Error deleting module:", error);
      return false;
    }
  }

  /**
   * Get modules with user progress
   */
  async getModulesWithProgress(userId: string): Promise<Module[]> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const modules = await this.getActiveModules();
    
    // Get all progress for this user
    const progressSnapshot = await db
      .collection(this.progressCollection)
      .where("userId", "==", userId)
      .get();

    const progressMap = new Map();
    progressSnapshot.docs.forEach(doc => {
      const data = doc.data();
      progressMap.set(data.moduleId, {
        id: doc.id,
        ...data,
      });
    });

    // Attach progress to modules
    return modules.map(module => ({
      ...module,
      progress: progressMap.get(module.id) || null,
    }));
  }

  /**
   * Create or update user progress
   */
  async saveUserProgress(progressData: Omit<UserProgress, "id" | "createdAt" | "updatedAt">): Promise<UserProgress> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const now = Timestamp.now().toDate().toISOString();
    
    // Check if progress already exists
    const existingProgress = await this.getUserProgress(progressData.userId, progressData.moduleId);
    
    if (existingProgress) {
      // Update existing progress
      const docRef = db.collection(this.progressCollection).doc(existingProgress.id);
      await docRef.update({
        ...progressData,
        updatedAt: now,
      });

      return {
        id: existingProgress.id,
        ...progressData,
        createdAt: existingProgress.createdAt,
        updatedAt: now,
      } as UserProgress;
    } else {
      // Create new progress
      const docRef = await db.collection(this.progressCollection).add({
        ...progressData,
        createdAt: now,
        updatedAt: now,
      });

      return {
        id: docRef.id,
        ...progressData,
        createdAt: now,
        updatedAt: now,
      } as UserProgress;
    }
  }

  /**
   * Get user progress for specific module
   */
  async getUserProgress(userId: string, moduleId: string): Promise<UserProgress | null> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const querySnapshot = await db
      .collection(this.progressCollection)
      .where("userId", "==", userId)
      .where("moduleId", "==", moduleId)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as UserProgress;
  }

  /**
   * Get all user progress
   */
  async getAllUserProgress(userId: string): Promise<UserProgress[]> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const querySnapshot = await db
      .collection(this.progressCollection)
      .where("userId", "==", userId)
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as UserProgress[];
  }

  /**
   * Mark section as completed
   */
  async markSectionCompleted(userId: string, moduleId: string, sectionId: string): Promise<UserProgress> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const progress = await this.getUserProgress(userId, moduleId);
    
    let completedSections: string[];
    if (progress) {
      completedSections = progress.completedSections.includes(sectionId) 
        ? progress.completedSections 
        : [...progress.completedSections, sectionId];
    } else {
      completedSections = [sectionId];
    }

    // Get module to calculate completion percentage
    const module = await this.getModuleById(moduleId);
    if (!module) {
      throw new Error("Module not found");
    }

    const totalSections = module.sections.filter(s => s.isActive).length;
    const completionPercentage = Math.round((completedSections.length / totalSections) * 100);    const progressData = {
      userId,
      moduleId,
      completedSections,
      quizCompleted: progress?.quizCompleted || false,
      quizScore: progress?.quizScore ?? null,
      quizAttempts: progress?.quizAttempts || 0,
      completionPercentage,
      lastAccessedAt: Timestamp.now().toDate().toISOString(),
    };

    return this.saveUserProgress(progressData);
  }

  /**
   * Save quiz result
   */
  async saveQuizResult(userId: string, moduleId: string, score: number): Promise<UserProgress> {
    if (!db) {
      throw new Error("Database not initialized");
    }

    const progress = await this.getUserProgress(userId, moduleId);
    
    const progressData = {
      userId,
      moduleId,
      completedSections: progress?.completedSections || [],
      quizCompleted: true,
      quizScore: score,
      quizAttempts: (progress?.quizAttempts || 0) + 1,
      completionPercentage: progress?.completionPercentage || 0,
      lastAccessedAt: Timestamp.now().toDate().toISOString(),
    };

    return this.saveUserProgress(progressData);
  }
}

// Export singleton
export const moduleRepository = new ModuleRepository();
