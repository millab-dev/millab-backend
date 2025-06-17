import { Quiz, Question, Option } from "../models/quiz";
import { quizRepository } from "../repositories/quiz.repository";

export class QuizService {
    /**
     * Validate quiz structure
     */
    private validateQuiz(quiz: Omit<Quiz, "id">): void {
        // Check if quiz has questions
        if (!quiz.questions || quiz.questions.length === 0) {
            throw new Error("Quiz must have at least one question");
        }

        // Validate each question
        quiz.questions.forEach((question, questionIndex) => {
            this.validateQuestion(question, questionIndex);
        });
    }

    /**
     * Validate individual question
     */
    private validateQuestion(question: Question, questionIndex: number): void {
        // Check if question text exists
        if (!question.question || question.question.trim() === "") {
            throw new Error(`Question ${questionIndex + 1} must have question text`);
        }

        // Check if question has exactly 4 options
        if (!question.options || question.options.length !== 4) {
            throw new Error(`Question ${questionIndex + 1} must have exactly 4 options`);
        }

        // Validate options
        this.validateOptions(question.options, questionIndex);
    }

    /**
     * Validate options for a question
     */
    private validateOptions(options: Option[], questionIndex: number): void {
        let correctAnswerCount = 0;

        options.forEach((option, optionIndex) => {
            // Check if option text exists
            if (!option.option || option.option.trim() === "") {
                throw new Error(
                    `Question ${questionIndex + 1}, Option ${optionIndex + 1} must have option text`
                );
            }

            // Count correct answers
            if (option.isCorrect) {
                correctAnswerCount++;
            }
        });

        // Check if there's exactly one correct answer
        if (correctAnswerCount === 0) {
            throw new Error(`Question ${questionIndex + 1} must have exactly one correct answer`);
        }

        if (correctAnswerCount > 1) {
            throw new Error(
                `Question ${questionIndex + 1} has ${correctAnswerCount} correct answers. Only one correct answer is allowed.`
            );
        }
    }

    /**
     * Create a new quiz with validation
     */
    async createQuiz(quiz: Omit<Quiz, "id">): Promise<Quiz> {
        try {
            // Validate quiz structure
            this.validateQuiz(quiz);

            // Create quiz using repository
            const createdQuiz = await quizRepository.createQuiz(quiz);
            
            return createdQuiz;
        } catch (error) {
            throw new Error(`Failed to create quiz: ${error}`);
        }
    }

    /**
     * Get quiz by ID
     */
    async getQuizById(id: string): Promise<Quiz | null> {
        try {
            if (!id || id.trim() === "") {
                throw new Error("Quiz ID is required");
            }

            return await quizRepository.getQuizById(id);
        } catch (error) {
            throw new Error(`Failed to get quiz: ${error}`);
        }
    }

    /**
     * Get all quizzes
     */
    async getAllQuizzes(): Promise<Quiz[]> {
        try {
            return await quizRepository.getAllQuizzes();
        } catch (error) {
            throw new Error(`Failed to get quizzes: ${error}`);
        }
    }

    /**
     * Get quizzes by module ID
     */
    async getQuizzesByModuleId(moduleId: string): Promise<Quiz[]> {
        try {
            if (!moduleId || moduleId.trim() === "") {
                throw new Error("Module ID is required");
            }

            return await quizRepository.getQuizzesByModuleId(moduleId);
        } catch (error) {
            throw new Error(`Failed to get quizzes by module: ${error}`);
        }
    }

    /**
     * Get module quizzes
     */
    async getModuleQuizzes(): Promise<Quiz[]> {
        try {
            return await quizRepository.getModuleQuizzes();
        } catch (error) {
            throw new Error(`Failed to get module quizzes: ${error}`);
        }
    }

    /**
     * Get final quizzes
     */
    async getFinalQuizzes(): Promise<Quiz[]> {
        try {
            return await quizRepository.getFinalQuizzes();
        } catch (error) {
            throw new Error(`Failed to get final quizzes: ${error}`);
        }
    }

    /**
     * Update quiz with validation
     */
    async updateQuiz(id: string, updates: Partial<Omit<Quiz, "id">>): Promise<Quiz> {
        try {
            if (!id || id.trim() === "") {
                throw new Error("Quiz ID is required");
            }

            // If questions are being updated, validate them
            if (updates.questions) {
                const tempQuiz = {
                    title: updates.title || "temp",
                    isModule: updates.isModule || false,
                    isFinalQuiz: updates.isFinalQuiz || false,
                    moduleId: updates.moduleId,
                    difficulty: updates.difficulty,
                    questions: updates.questions
                };
                this.validateQuiz(tempQuiz);
            }

            return await quizRepository.updateQuiz(id, updates);
        } catch (error) {
            throw new Error(`Failed to update quiz: ${error}`);
        }
    }

    /**
     * Delete quiz
     */
    async deleteQuiz(id: string): Promise<boolean> {
        try {
            if (!id || id.trim() === "") {
                throw new Error("Quiz ID is required");
            }

            return await quizRepository.deleteQuiz(id);
        } catch (error) {
            throw new Error(`Failed to delete quiz: ${error}`);
        }
    }

    /**
     * Get quizzes by difficulty
     */
    async getQuizzesByDifficulty(difficulty: string): Promise<Quiz[]> {
        try {
            if (!difficulty || difficulty.trim() === "") {
                throw new Error("Difficulty is required");
            }

            return await quizRepository.getQuizzesByDifficulty(difficulty);
        } catch (error) {
            throw new Error(`Failed to get quizzes by difficulty: ${error}`);
        }
    }

    /**
     * Calculate quiz score
     */
    calculateScore(quiz: Quiz, userAnswers: { [questionIndex: number]: number }): {
        score: number;
        totalQuestions: number;
        correctAnswers: number;
        percentage: number;
        details: { questionIndex: number; isCorrect: boolean; correctOptionIndex: number }[];
    } {
        const details: { questionIndex: number; isCorrect: boolean; correctOptionIndex: number }[] = [];
        let correctAnswers = 0;

        quiz.questions.forEach((question, questionIndex) => {
            const correctOptionIndex = question.options.findIndex(option => option.isCorrect);
            const userAnswerIndex = userAnswers[questionIndex];
            const isCorrect = userAnswerIndex === correctOptionIndex;

            if (isCorrect) {
                correctAnswers++;
            }

            details.push({
                questionIndex,
                isCorrect,
                correctOptionIndex
            });
        });

        const totalQuestions = quiz.questions.length;
        const percentage = Math.round((correctAnswers / totalQuestions) * 100);

        return {
            score: correctAnswers,
            totalQuestions,
            correctAnswers,
            percentage,
            details
        };
    }

    /**
     * Validate quiz answers format
     */
    validateAnswers(quiz: Quiz, userAnswers: { [questionIndex: number]: number }): void {
        if (!userAnswers || typeof userAnswers !== 'object') {
            throw new Error("User answers must be provided as an object");
        }

        quiz.questions.forEach((_, questionIndex) => {
            const userAnswer = userAnswers[questionIndex];
            
            if (userAnswer === undefined || userAnswer === null) {
                throw new Error(`Answer for question ${questionIndex + 1} is required`);
            }

            if (!Number.isInteger(userAnswer) || userAnswer < 0 || userAnswer > 3) {
                throw new Error(`Answer for question ${questionIndex + 1} must be a number between 0 and 3`);
            }
        });
    }
}

// Export a singleton instance
export const quizService = new QuizService(); 