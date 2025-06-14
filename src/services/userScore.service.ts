import { UserScore } from "../models/userScore";
import { UserScoreRepository } from "../repositories/userScore.repository";

export class UserScoreService {
    private userScoreRepository: UserScoreRepository;

    constructor() {
        this.userScoreRepository = new UserScoreRepository();
    }

    async getUserScore(userId: string): Promise<UserScore | null> {
        return this.userScoreRepository.getUserScoreByUserId(userId);
    }

    async updateUserScore(userId: string, score: number): Promise<UserScore> {
        return this.userScoreRepository.updateUserScore(userId, score);
    }

    async addScore(userId: string, score: number): Promise<UserScore> {
        return this.userScoreRepository.addScoreToUserScore(userId, score);
    }

    async getAllUserScores(): Promise<UserScore[]> {
        return this.userScoreRepository.getUserScores();
    }

    async deleteUserScore(userId: string): Promise<void> {
        return this.userScoreRepository.deleteUserScore(userId);
    }

    async resetAllScores(): Promise<void> {
        return this.userScoreRepository.resetAllUserScores();
    }
} 