import { UserScoreRepository } from "../repositories/userScore.repository";
import { UserRepository } from "../repositories/user.repository";
import { levelConfigRepository } from "../repositories/levelConfig.repository";
import { UserScore } from "../models/userScore";
import { User, PointsGainRecord } from "../models/user";
import { LevelConfig } from "../models/levelConfig";
import { db } from "../config/firebase";

export interface LeaderboardEntry {
    userId: string;
    name: string;
    score: number;
}

export interface QuizAttemptResult {
    isFirstAttempt: boolean;
    pointsEarned: number;
    message: string;
}

export class PointsService {
    private userScoreRepository: UserScoreRepository;
    private userRepository: UserRepository;    constructor() {
        this.userScoreRepository = new UserScoreRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Check if user has completed a quiz/section for the first time
     * Initialize Firebase document if it doesn't exist
     */    private async checkFirstAttempt(userId: string, source: 'module_quiz' | 'final_quiz' | 'section_read', sourceId: string): Promise<boolean> {
        try {
            if (!db) {
                console.warn('Firebase not initialized, defaulting to false for first attempt check');
                return false;
            }

            const userAttemptsRef = db.collection('userQuizAttempts').doc(userId);
            const userAttemptsDoc = await userAttemptsRef.get();

            if (!userAttemptsDoc.exists) {
                // Initialize user attempts document
                await userAttemptsRef.set({
                    userId,
                    attempts: {},
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                return true; // First attempt for this user
            }

            const userData = userAttemptsDoc.data();
            const attemptKey = `${source}_${sourceId}`;
            
            // Check if this specific quiz/section has been attempted before
            return !userData?.attempts?.[attemptKey];
        } catch (error) {
            console.error('Error checking first attempt:', error);
            // If there's an error, assume it's not the first attempt to be safe
            return false;
        }
    }

    /**
     * Mark a quiz/section as attempted in Firebase
     */    async markAsAttempted(userId: string, source: 'module_quiz' | 'final_quiz' | 'section_read', sourceId: string): Promise<void> {
        try {
            if (!db) {
                console.warn('Firebase not initialized, cannot mark as attempted');
                return;
            }

            const userAttemptsRef = db.collection('userQuizAttempts').doc(userId);
            const attemptKey = `${source}_${sourceId}`;
            
            await userAttemptsRef.update({
                [`attempts.${attemptKey}`]: {
                    completedAt: new Date().toISOString(),
                    source,
                    sourceId
                },
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error marking as attempted:', error);
            throw error;
        }
    }

    /**
     * Get user's quiz attempt status for frontend warnings
     */
    async getQuizAttemptStatus(userId: string, source: 'module_quiz' | 'final_quiz' | 'section_read', sourceId: string): Promise<{ isFirstAttempt: boolean }> {
        const isFirstAttempt = await this.checkFirstAttempt(userId, source, sourceId);
        return { isFirstAttempt };
    }/**
     * Calculate points for section reading based on difficulty
     */
    async calculateSectionPoints(
        difficulty: 'Easy' | 'Intermediate' | 'Advanced'
    ): Promise<number> {
        const pointsConfig = await levelConfigRepository.getPointsConfig();
        if (!pointsConfig) {
            // Fallback to default values
            const defaultPoints = { Easy: 2, Intermediate: 3, Advanced: 5 };
            return defaultPoints[difficulty] || 2;
        }

        const difficultyKey = difficulty.toLowerCase() as 'easy' | 'intermediate' | 'advanced';
        const points = pointsConfig.sectionPoints[difficultyKey];

        return points;
    }    /**
     * Calculate points for module quiz based on difficulty and correct answers
     */
    async calculateModuleQuizPoints(
        difficulty: 'Easy' | 'Intermediate' | 'Advanced',
        correctAnswers: number
    ): Promise<number> {
        const pointsConfig = await levelConfigRepository.getPointsConfig();
        if (!pointsConfig) {
            // Fallback to default values
            const defaultPointsPerQuestion = { Easy: 1, Intermediate: 2, Advanced: 4 };
            return correctAnswers * (defaultPointsPerQuestion[difficulty] || 1);
        }

        const difficultyKey = difficulty.toLowerCase() as 'easy' | 'intermediate' | 'advanced';
        const points = correctAnswers * pointsConfig.quizPoints[difficultyKey];

        return points;
    }    /**
     * Calculate points for final quiz
     */
    async calculateFinalQuizPoints(
        correctAnswers: number,
        difficulty: 'easy' | 'intermediate' | 'advanced' = 'intermediate'
    ): Promise<number> {
        const pointsConfig = await levelConfigRepository.getPointsConfig();
        if (!pointsConfig) {
            // Fallback to default values based on difficulty
            const defaultPoints = { easy: 2, intermediate: 3, advanced: 5 };
            return correctAnswers * defaultPoints[difficulty];
        }

        const points = correctAnswers * pointsConfig.finalQuizPoints[difficulty];

        return points;
    }    /**
     * Add points to user score (only for first attempts)
     */
    async addPointsForFirstAttempt(
        userId: string,
        points: number,
        source: 'module_quiz' | 'final_quiz',
        sourceId: string,
        difficulty?: 'Easy' | 'Intermediate' | 'Advanced'
    ): Promise<UserScore> {
        // Check if this is truly the first attempt by checking scoring history
        const hasAlreadyScored = await this.hasAlreadyScoredFromSource(userId, source, sourceId);
        
        if (hasAlreadyScored) {
            // Return existing score without adding points
            const existingScore = await this.userScoreRepository.getUserScoreByUserId(userId);
            if (!existingScore) {
                throw new Error("User score not found");
            }
            return existingScore;
        }

        // Add points for first attempt
        const userScore = await this.userScoreRepository.addScoreToUserScore(userId, points);

        // Record points history in user document
        await this.addPointsHistory(userId, source, sourceId, points, difficulty);

        return userScore;
    }/**
     * Add points history record to user
     */
    private async addPointsHistory(
        userId: string,
        source: 'module_quiz' | 'final_quiz' | 'section_read',
        sourceId: string,
        pointsGained: number,
        difficulty?: 'Easy' | 'Intermediate' | 'Advanced'
    ): Promise<void> {
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const pointsRecord: PointsGainRecord = {
            source,
            sourceId,
            pointsGained,
            timestamp: new Date().toISOString(),
            difficulty
        };

        const pointsHistory = user.pointsHistory || [];
        pointsHistory.push(pointsRecord);

        await this.userRepository.updateUser(userId, {
            pointsHistory
        });
    }    /**
     * Check if user has already scored points from a specific source
     */
    private async hasAlreadyScoredFromSource(
        userId: string,
        source: 'module_quiz' | 'final_quiz' | 'section_read',
        sourceId: string
    ): Promise<boolean> {
        const user = await this.userRepository.getUserById(userId);
        if (!user || !user.pointsHistory) return false;

        return user.pointsHistory.some(record => 
            record.source === source && record.sourceId === sourceId
        );
    }

    /**
     * Get user's current points
     */
    async getUserPoints(userId: string): Promise<number> {
        const userScore = await this.userScoreRepository.getUserScoreByUserId(userId);
        return userScore?.score || 0;
    }

    /**
     * Get leaderboard data sorted by points with user names
     */
    async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
        const allScores = await this.userScoreRepository.getUserScores();
        const sortedScores = allScores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // Fetch user names for each score
        const leaderboardWithNames: LeaderboardEntry[] = [];        for (const userScore of sortedScores) {
            try {
                const user = await this.userRepository.getUserById(userScore.userId);
                console.log(`User ${userScore.userId}:`, { username: user?.username, name: user?.name });
                leaderboardWithNames.push({
                    userId: userScore.userId,
                    name: user?.username || `No Username`,
                    score: userScore.score
                });
            } catch (error) {
                console.error(`Error fetching user ${userScore.userId}:`, error);
                // If user not found, still include with default name
                leaderboardWithNames.push({
                    userId: userScore.userId,
                    name: `No Username`,
                    score: userScore.score
                });
            }
        }

        return leaderboardWithNames;
    }

    /**
     * Get user's rank in leaderboard
     */
    async getUserRank(userId: string): Promise<number> {
        const allScores = await this.userScoreRepository.getUserScores();
        const sortedScores = allScores.sort((a, b) => b.score - a.score);
        
        const userIndex = sortedScores.findIndex(score => score.userId === userId);
        return userIndex >= 0 ? userIndex + 1 : -1; // Return -1 if user not found
    }    /**
     * Get user progression data (points-based)
     */
    async getUserProgression(userId: string) {
        try {
            const user = await this.userRepository.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const userPoints = await this.getUserPoints(userId);
            const userRank = await this.getUserRank(userId);

            // Get current level based on points
            const levels = await levelConfigRepository.getAllLevels();
            const activeLevels = levels.filter((l: LevelConfig) => l.isActive).sort((a: LevelConfig, b: LevelConfig) => a.level - b.level);
            
            // Default level if no active levels found
            const defaultLevel = { level: 1, title: "Beginner", minPoints: 0 };
            let currentLevel = activeLevels.length > 0 ? activeLevels[0] : defaultLevel;
            let nextLevel = null;
            
            if (activeLevels.length > 0) {
                for (const level of activeLevels) {
                    if (userPoints >= level.minPoints) {
                        currentLevel = level;
                    } else {
                        nextLevel = level;
                        break;
                    }
                }
            }

            return {
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                },
                points: userPoints,
                level: currentLevel.level,
                levelTitle: currentLevel.title,
                pointsForNextLevel: nextLevel ? nextLevel.minPoints - userPoints : 0,
                nextLevelTitle: nextLevel?.title || null,
                rank: userRank,
                pointsHistory: user.pointsHistory || []
            };
        } catch (error) {
            console.error('Error getting user progression:', error);
            throw error;
        }
    }

    /**
     * Add points for section reading
     */
    async addPointsForSection(userId: string, sectionId: string, difficulty: 'Easy' | 'Intermediate' | 'Advanced') {
        try {
            // Check if user has already gained points from this section
            const user = await this.userRepository.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check if already scored from this section
            const alreadyScored = await this.hasAlreadyScoredFromSource(userId, 'section_read', sectionId);
            if (alreadyScored) {
                return {
                    success: false,
                    message: 'Points already awarded for this section',
                    pointsGained: 0,
                    newLevel: null
                };
            }            // Calculate points
            const points = await this.calculateSectionPoints(difficulty);// Add points to user score
            const previousPoints = await this.getUserPoints(userId);
            await this.userScoreRepository.addScoreToUserScore(userId, points);

            // Add to points history
            await this.addPointsHistory(userId, 'section_read', sectionId, points, difficulty);            // Check for level up
            const newPoints = await this.getUserPoints(userId);
            const levels = await levelConfigRepository.getAllLevels();
            const activeLevels = levels.filter((l: LevelConfig) => l.isActive).sort((a: LevelConfig, b: LevelConfig) => a.level - b.level);
            
            // Ensure we have at least one level
            if (activeLevels.length === 0) {
                console.warn('No active levels found, using default level');
                const defaultLevel = { level: 1, title: "Beginner", minPoints: 0 };
                return {
                    success: true,
                    pointsGained: points,
                    totalPoints: newPoints,
                    levelUp: false,
                    newLevel: null,
                    currentLevel: defaultLevel
                };
            }
            
            let previousLevel = activeLevels[0];
            let currentLevel = activeLevels[0];
            
            for (const level of activeLevels) {
                if (previousPoints >= level.minPoints) {
                    previousLevel = level;
                }
                if (newPoints >= level.minPoints) {
                    currentLevel = level;
                }
            }

            const levelUp = currentLevel.level > previousLevel.level;

            return {
                success: true,
                pointsGained: points,
                totalPoints: newPoints,
                levelUp,
                newLevel: levelUp ? currentLevel : null,
                currentLevel: currentLevel
            };

        } catch (error) {
            console.error('Error adding points for section:', error);
            throw error;
        }
    }}
