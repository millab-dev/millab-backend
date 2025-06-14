import { UserScore } from "../models/userScore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "userScores";

export class UserScoreRepository {
    private getDb() {
        if (!db) {
            throw new Error("Firebase is not initialized");
        }
        return db;
    }

    /**
     * Fetch user score by userId
     * if not found, create a new user score
     */
    async getUserScoreByUserId(userId: string): Promise<UserScore | null> {
        try {
            const db = this.getDb();
            const docRef = await db.collection(COLLECTION_NAME).doc(userId).get();
            if (!docRef.exists) {
                const newUserScore: UserScore = {
                    userId,
                    score: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                await db.collection(COLLECTION_NAME).doc(userId).set(newUserScore);
                return newUserScore;
            }
            return docRef.data() as UserScore;
        } catch (error) {
            throw new Error(`Failed to get user score: ${error}`);
        }
    }

    async updateUserScore(userId: string, score: number): Promise<UserScore> {
        try {
            const db = this.getDb();
            const docRef = await db.collection(COLLECTION_NAME).doc(userId).get();
            if (!docRef.exists) {
                throw new Error("User score not found");
            }
            const userScore = docRef.data() as UserScore;
            userScore.score = score;
            userScore.updatedAt = new Date();
            await db.collection(COLLECTION_NAME).doc(userId).set(userScore);
            return userScore;
        } catch (error) {
            throw new Error(`Failed to update user score: ${error}`);
        }
    }

    async deleteUserScore(userId: string): Promise<void> {
        try {
            const db = this.getDb();
            await db.collection(COLLECTION_NAME).doc(userId).delete();
        } catch (error) {
            throw new Error(`Failed to delete user score: ${error}`);
        }
    }

    async getUserScores(): Promise<UserScore[]> {
        try {
            const db = this.getDb();
            const docRef = await db.collection(COLLECTION_NAME).get();
            return docRef.docs.map((doc) => doc.data() as UserScore);
        } catch (error) {
            throw new Error(`Failed to get user scores: ${error}`);
        }
    }

    async addScoreToUserScore(userId: string, score: number): Promise<UserScore> {
        try {
            const db = this.getDb();
            const docRef = await db.collection(COLLECTION_NAME).doc(userId).get();
            if (!docRef.exists) {
                throw new Error("User score not found");
            }
            const userScore = docRef.data() as UserScore;
            userScore.score += score;
            userScore.updatedAt = new Date();
            await db.collection(COLLECTION_NAME).doc(userId).set(userScore);
            return userScore;
        } catch (error) {
            throw new Error(`Failed to add score to user score: ${error}`);
        }
    }

    async resetAllUserScores(): Promise<void> {
        try {
            const db = this.getDb();
            const docRef = await db.collection(COLLECTION_NAME).get();
            docRef.docs.forEach(async (doc) => {
                await db.collection(COLLECTION_NAME).doc(doc.id).set({ score: 0, updatedAt: new Date() });
            });
        } catch (error) {
            throw new Error(`Failed to reset all user scores: ${error}`);
        }
    }
}