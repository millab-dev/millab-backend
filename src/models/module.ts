/**
 * Module model for dynamic module management
 */
export interface Module {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  order: number; // For ordering modules
  sections: ModuleSection[];
  quiz: ModuleQuiz;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Module section (individual learning units)
 */
export interface ModuleSection {
  id: string;
  title: string;
  content: string; // HTML content or markdown
  duration: string; // e.g., "5 min"
  order: number;
  pdfUrl?: string; // Optional PDF download link
  isActive: boolean;
}

/**
 * Module quiz information
 */
export interface ModuleQuiz {
  id: string;
  title: string;
  description: string;
  duration: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  isActive: boolean;
}

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation?: string;
  order: number;
}

/**
 * User progress tracking
 */
export interface UserProgress {
  id: string;
  userId: string;
  moduleId: string;
  completedSections: string[]; // Array of section IDs
  quizCompleted: boolean;
  quizScore: number | null;
  quizAttempts: number;
  completionPercentage: number;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create module data
 */
export interface CreateModuleData {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  order: number;
  sections: CreateModuleSectionData[];
  quiz: CreateModuleQuizData;
  isActive: boolean;
}

/**
 * Create module section data
 */
export interface CreateModuleSectionData {
  title: string;
  content: string;
  duration: string;
  order: number;
  pdfUrl?: string;
  isActive: boolean;
}

/**
 * Create module quiz data
 */
export interface CreateModuleQuizData {
  title: string;
  description: string;
  duration: string;
  totalQuestions: number;
  questions: CreateQuizQuestionData[];
  isActive: boolean;
}

/**
 * Create quiz question data
 */
export interface CreateQuizQuestionData {
  question: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: number;
  explanation?: string;
  order: number;
}

/**
 * Update module data
 */
export interface UpdateModuleData {
  title?: string;
  description?: string;
  difficulty?: 'Easy' | 'Intermediate' | 'Advanced';
  order?: number;
  sections?: UpdateModuleSectionData[];
  quiz?: UpdateModuleQuizData;
  isActive?: boolean;
}

/**
 * Update module section data
 */
export interface UpdateModuleSectionData {
  id?: string;
  title: string;
  content: string;
  duration: string;
  order: number;
  pdfUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Update module quiz data
 */
export interface UpdateModuleQuizData {
  id?: string;
  title: string;
  description: string;
  duration: string;
  totalQuestions: number;
  questions: UpdateQuizQuestionData[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Update quiz question data
 */
export interface UpdateQuizQuestionData {
  id?: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: number;
  explanation?: string;
  order: number;
}
