/**
 * Module model for dynamic module management
 */
export interface Module {
  id: string;
  title: string;
  titleEn?: string; // English title
  description: string;
  descriptionEn?: string; // English description
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  order: number; // For ordering modules
  pdfUrl?: string; // PDF download link for the entire module
  pdfUrlEn?: string; // English PDF download link
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
  titleEn?: string; // English title
  content: string; // HTML content or markdown
  contentEn?: string; // English content
  duration: string; // e.g., "5 min"
  order: number;
  isActive: boolean;
}

/**
 * Module quiz information
 */
export interface ModuleQuiz {
  id: string;
  title: string;
  titleEn?: string; // English title
  description: string;
  descriptionEn?: string; // English description
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
  questionEn?: string; // English question
  type: 'multiple-choice' | 'true-false';
  options: string[];
  optionsEn?: string[]; // English options
  correctAnswer: number; // Index of correct option
  explanation?: string;
  explanationEn?: string; // English explanation
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
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  order: number;
  pdfUrl?: string;
  pdfUrlEn?: string;
  sections: CreateModuleSectionData[];
  quiz: CreateModuleQuizData;
  isActive: boolean;
}

/**
 * Create module section data
 */
export interface CreateModuleSectionData {
  title: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  duration: string;
  order: number;
  isActive: boolean;
}

/**
 * Create module quiz data
 */
export interface CreateModuleQuizData {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
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
  questionEn?: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  optionsEn?: string[];
  correctAnswer: number;
  explanation?: string;
  explanationEn?: string;
  order: number;
}

/**
 * Update module data
 */
export interface UpdateModuleData {
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  difficulty?: 'Easy' | 'Intermediate' | 'Advanced';
  order?: number;
  pdfUrl?: string;
  pdfUrlEn?: string;
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
  titleEn?: string;
  content: string;
  contentEn?: string;
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
  titleEn?: string;
  description: string;
  descriptionEn?: string;
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
  questionEn?: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  optionsEn?: string[];
  correctAnswer: number;
  explanation?: string;
  explanationEn?: string;
  order: number;
}
