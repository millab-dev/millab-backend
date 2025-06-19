import { User, ExpGainRecord } from "../models/user";
import { UserRepository } from "../repositories/user.repository";

export class ProgressionService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    /**
     * Calculate required XP for a given level
     * Formula: level * 100 + (level - 1) * 20 (incrementally increasing)
     */
    private calculateRequiredExp(level: number): number {
        if (level <= 1) return 120; // Level 1 requires 120 XP
        
        let totalExp = 120; // Base for level 1
        for (let i = 2; i <= level; i++) {
            totalExp += 100 + (i - 2) * 20; // Incremental increase
        }
        return totalExp;
    }

    /**
     * Calculate current level based on total XP
     */
    private calculateLevel(currentExp: number): number {
        let level = 1;
        let requiredExp = 120;
        
        while (currentExp >= requiredExp) {
            level++;
            requiredExp = this.calculateRequiredExp(level);
        }
        
        return level - 1; // Return the completed level
    }

    /**
     * Get XP needed for next level
     */
    private getExpForNextLevel(currentExp: number, currentLevel: number): number {
        const nextLevelRequiredExp = this.calculateRequiredExp(currentLevel + 1);
        return nextLevelRequiredExp - currentExp;
    }

    /**
     * Update day streak for a user
     */
    async updateDayStreak(userId: string): Promise<User> {
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
        const lastActiveDate = user.lastActiveDate ? user.lastActiveDate.split('T')[0] : null;
        
        let newStreak = user.dayStreak || 0;
        
        if (!lastActiveDate) {
            // First time logging in
            newStreak = 1;
        } else {
            const lastDate = new Date(lastActiveDate);
            const todayDate = new Date(today);
            const diffTime = todayDate.getTime() - lastDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                // Consecutive day
                newStreak += 1;
            } else if (diffDays > 1) {
                // Streak broken
                newStreak = 1;
            }
            // If diffDays === 0, same day, don't change streak
        }        const updatedUser = await this.userRepository.updateUser(userId, {
            dayStreak: newStreak,
            lastActiveDate: new Date().toISOString()
        });

        if (!updatedUser) {
            throw new Error("Failed to update user");
        }

        return updatedUser;
    }

    /**
     * Add XP to a user and handle level ups
     */    async addExperience(
        userId: string, 
        expGain: number, 
        source: ExpGainRecord['source'], 
        sourceId: string,
        attemptNumber?: number
    ): Promise<{ user: User; leveledUp: boolean; newLevel?: number }> {
        console.log('=== ADD EXPERIENCE START ===');
        console.log('userId:', userId);
        console.log('expGain:', expGain);
        console.log('source:', source);
        console.log('sourceId:', sourceId);

        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            console.error('User not found:', userId);
            throw new Error("User not found");
        }

        console.log('Current user data:', {
            currentExp: user.currentExp,
            level: user.level,
            expHistoryLength: user.expHistory?.length || 0
        });

        const currentExp = (user.currentExp || 0) + expGain;
        const oldLevel = user.level || 1;
        const newLevel = this.calculateLevel(currentExp);
        const leveledUp = newLevel > oldLevel;        const expRecord: ExpGainRecord = {
            source,
            sourceId,
            expGained: expGain,
            timestamp: new Date().toISOString(),
            ...(attemptNumber !== undefined && { attemptNumber })
        };

        const expHistory = user.expHistory || [];
        expHistory.push(expRecord);

        const updateData = {
            currentExp,
            level: newLevel,
            expHistory
        };

        console.log('Update data:', updateData);

        const updatedUser = await this.userRepository.updateUser(userId, updateData);

        if (!updatedUser) {
            console.error('Failed to update user - updateUser returned null');
            throw new Error("Failed to update user");
        }

        console.log('=== ADD EXPERIENCE SUCCESS ===');
        return { user: updatedUser, leveledUp, newLevel: leveledUp ? newLevel : undefined };
    }

    /**
     * Get XP for reading a section based on module difficulty
     */    getExpForSectionRead(moduleDifficulty: 'Easy' | 'Intermediate' | 'Advanced'): number {
        switch (moduleDifficulty) {
            case 'Easy': return 1;
            case 'Intermediate': return 2;
            case 'Advanced': return 4;
            default: return 1;
        }
    }

    /**
     * Get XP for quiz attempts based on module difficulty
     */
    getExpForQuizAttempt(moduleDifficulty: 'Easy' | 'Intermediate' | 'Advanced', score: number, maxScore: number): number {
        const baseExp = {
            'Easy': 10,
            'Intermediate': 15,
            'Advanced': 25
        };
        
        const difficultyExp = baseExp[moduleDifficulty] || baseExp['Easy'];
        const scoreMultiplier = score / maxScore; // Percentage of correct answers
        
        return Math.round(difficultyExp * scoreMultiplier);
    }

    /**
     * Check if user has already gained XP from a specific source
     */
    async hasAlreadyGainedExp(userId: string, source: string, sourceId: string, maxAttempts: number = 2): Promise<boolean> {
        const user = await this.userRepository.getUserById(userId);
        if (!user || !user.expHistory) return false;

        const relevantRecords = user.expHistory.filter(record => 
            record.source === source && record.sourceId === sourceId
        );

        if (source === 'section_read') {
            // For sections, only allow XP once
            return relevantRecords.length > 0;
        } else if (source === 'quiz_attempt') {
            // For module quizzes, allow XP for first 2 attempts
            return relevantRecords.length >= maxAttempts;
        } else if (source === 'final_quiz') {
            // For final quiz, only allow XP once (first attempt only)
            return relevantRecords.length > 0;
        }

        return false;
    }

    /**
     * Get user progression data
     */
    async getUserProgression(userId: string): Promise<{
        currentExp: number;
        level: number;
        expForNextLevel: number;
        totalExpForNextLevel: number;
        dayStreak: number;
        progressPercentage: number;
    }> {
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const currentExp = user.currentExp || 0;
        const level = user.level || 1;
        const dayStreak = user.dayStreak || 0;
        
        const totalExpForNextLevel = this.calculateRequiredExp(level + 1);
        const expForCurrentLevel = level > 1 ? this.calculateRequiredExp(level) : 0;
        const expNeededForNextLevel = totalExpForNextLevel - currentExp;
        const expProgressInCurrentLevel = currentExp - expForCurrentLevel;
        const expRequiredForCurrentLevel = totalExpForNextLevel - expForCurrentLevel;
        
        const progressPercentage = (expProgressInCurrentLevel / expRequiredForCurrentLevel) * 100;

        return {
            currentExp,
            level,
            expForNextLevel: expNeededForNextLevel,
            totalExpForNextLevel,
            dayStreak,
            progressPercentage: Math.max(0, Math.min(100, progressPercentage))
        };
    }
}
