import { UserScoreRepository } from "../repositories/userScore.repository";
import { UserRepository } from "../repositories/user.repository";
import { UserScore } from "../models/userScore";
import { User, PointsGainRecord } from "../models/user";

export interface LeaderboardEntry {
    userId: string;
    name: string;
    score: number;
}

export class PointsService {
    private userScoreRepository: UserScoreRepository;
    private userRepository: UserRepository;

    constructor() {
        this.userScoreRepository = new UserScoreRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Calculate points for module quiz based on difficulty and correct answers
     */
    calculateModuleQuizPoints(
        difficulty: 'Easy' | 'Intermediate' | 'Advanced',
        correctAnswers: number
    ): number {
        const pointsPerQuestion = {
            'Easy': 1,
            'Intermediate': 2,
            'Advanced': 4
        };

        return correctAnswers * (pointsPerQuestion[difficulty] || 1);
    }

    /**
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
    }

    /**
     * Add points history record to user
     */
    private async addPointsHistory(
        userId: string,
        source: 'module_quiz' | 'final_quiz',
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
    }

    /**
     * Check if user has already scored points from a specific source
     */
    private async hasAlreadyScoredFromSource(
        userId: string,
        source: 'module_quiz' | 'final_quiz',
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
    }
}
