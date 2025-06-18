import { db } from "../config/firebase";
import { Quiz } from "../models/quiz";

const COLLECTION_NAME = "quizzes";

export class QuizRepository {
    private getDb() {
        if (!db) {
            throw new Error("Firebase is not initialized");
        }
        return db;
    }

    /**
     * Create a new quiz
     */
    async createQuiz(quiz: Omit<Quiz, "id">): Promise<Quiz> {
        try {
            const db = this.getDb();
            const docRef = await db.collection(COLLECTION_NAME).add({
                ...quiz,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            return {
                id: docRef.id,
                ...quiz,
            };
        } catch (error) {
            throw new Error(`Failed to create quiz: ${error}`);
        }
    }

    /**
     * Get quiz by ID
     */
    async getQuizById(id: string): Promise<Quiz | null> {
        try {
            const db = this.getDb();
            const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();

            if (docSnap.exists) {
                return {
                    id: docSnap.id,
                    ...docSnap.data(),
                } as Quiz;
            }

            return null;
        } catch (error) {
            throw new Error(`Failed to get quiz: ${error}`);
        }
    }

    /**
     * Get all quizzes
     */
    async getAllQuizzes(): Promise<Quiz[]> {
        try {
            const db = this.getDb();
            const querySnapshot = await db.collection(COLLECTION_NAME).get();
            const quizzes: Quiz[] = [];

            querySnapshot.forEach((doc) => {
                quizzes.push({
                    id: doc.id,
                    ...doc.data(),
                } as Quiz);
            });

            return quizzes;
        } catch (error) {
            throw new Error(`Failed to get quizzes: ${error}`);
        }
    }

    /**
     * Get quizzes by module ID
     */
    async getQuizzesByModuleId(moduleId: string): Promise<Quiz[]> {
        try {
            const db = this.getDb();
            const querySnapshot = await db
                .collection(COLLECTION_NAME)
                .where("moduleId", "==", moduleId)
                .orderBy("createdAt", "desc")
                .get();

            const quizzes: Quiz[] = [];

            querySnapshot.forEach((doc) => {
                quizzes.push({
                    id: doc.id,
                    ...doc.data(),
                } as Quiz);
            });

            return quizzes;
        } catch (error) {
            throw new Error(`Failed to get quizzes by module: ${error}`);
        }
    }

    /**
     * Get module quizzes
     */
    async getModuleQuizzes(): Promise<Quiz[]> {
        try {
            const db = this.getDb();
            const querySnapshot = await db
                .collection(COLLECTION_NAME)
                .where("isModule", "==", true)
                .orderBy("createdAt", "desc")
                .get();

            const quizzes: Quiz[] = [];

            querySnapshot.forEach((doc) => {
                quizzes.push({
                    id: doc.id,
                    ...doc.data(),
                } as Quiz);
            });

            return quizzes;
        } catch (error) {
            throw new Error(`Failed to get module quizzes: ${error}`);
        }
    }

    /**
     * Get final quizzes
     */
    async getFinalQuizzes(): Promise<Quiz[]> {
        try {
            const db = this.getDb();
            const querySnapshot = await db
                .collection(COLLECTION_NAME)
                .where("isFinalQuiz", "==", true)
                .orderBy("createdAt", "desc")
                .get();

            const quizzes: Quiz[] = [];

            querySnapshot.forEach((doc) => {
                quizzes.push({
                    id: doc.id,
                    ...doc.data(),
                } as Quiz);
            });

            return quizzes;
        } catch (error) {
            throw new Error(`Failed to get final quizzes: ${error}`);
        }
    }

    /**
     * Update quiz by ID
     */
    async updateQuiz(
        id: string,
        updates: Partial<Omit<Quiz, "id">>
    ): Promise<Quiz> {
        try {
            const db = this.getDb();
            const docRef = db.collection(COLLECTION_NAME).doc(id);

            // Check if quiz exists
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
                throw new Error("Quiz not found");
            }

            await docRef.update({
                ...updates,
                updatedAt: new Date(),
            });

            // Return updated quiz
            const updatedDoc = await docRef.get();
            return {
                id: updatedDoc.id,
                ...updatedDoc.data(),
            } as Quiz;
        } catch (error) {
            throw new Error(`Failed to update quiz: ${error}`);
        }
    }

    /**
     * Delete quiz by ID
     */
    async deleteQuiz(id: string): Promise<boolean> {
        try {
            const db = this.getDb();
            const docRef = db.collection(COLLECTION_NAME).doc(id);

            // Check if quiz exists
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
                throw new Error("Quiz not found");
            }

            await docRef.delete();
            return true;
        } catch (error) {
            throw new Error(`Failed to delete quiz: ${error}`);
        }
    }

    /**
     * Get quizzes by difficulty
     */
    async getQuizzesByDifficulty(difficulty: string): Promise<Quiz[]> {
        try {
            const db = this.getDb();
            const querySnapshot = await db
                .collection(COLLECTION_NAME)
                .where("difficulty", "==", difficulty)
                .orderBy("createdAt", "desc")
                .get();

            const quizzes: Quiz[] = [];

            querySnapshot.forEach((doc) => {
                quizzes.push({
                    id: doc.id,
                    ...doc.data(),
                } as Quiz);
            });

            return quizzes;
        } catch (error) {
            throw new Error(`Failed to get quizzes by difficulty: ${error}`);
        }
    }
}

// Export a singleton instance
export const quizRepository = new QuizRepository();
