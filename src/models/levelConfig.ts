/**
 * Level Configuration model for admin to manage progression system
 */
export interface LevelConfig {
  id: string;
  level: number;
  minPoints: number; // Minimum points required to reach this level
  title: string; // Level title (e.g., "Beginner", "Intermediate", "Expert")
  description?: string; // Description of this level
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Points Configuration model for admin to manage point rewards
 */
export interface PointsConfig {
  id: string;
  // Section reading points
  sectionPoints: {
    easy: number;
    intermediate: number;
    advanced: number;
  };
  // Quiz completion points (per correct answer)
  quizPoints: {
    easy: number;
    intermediate: number;
    advanced: number;
  };  // Final quiz points (per correct answer) by difficulty
  finalQuizPoints: {
    easy: number;
    intermediate: number;
    advanced: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Default level configuration
 */
export const DEFAULT_LEVELS: Omit<LevelConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { level: 1, minPoints: 0, title: "Beginner", description: "Just getting started", isActive: true },
  { level: 2, minPoints: 50, title: "Student", description: "Learning the basics", isActive: true },
  { level: 3, minPoints: 150, title: "Learner", description: "Making good progress", isActive: true },
  { level: 4, minPoints: 300, title: "Scholar", description: "Showing dedication", isActive: true },
  { level: 5, minPoints: 500, title: "Expert", description: "Mastering the content", isActive: true },
  { level: 6, minPoints: 750, title: "Advanced", description: "Exceptional learner", isActive: true },
  { level: 7, minPoints: 1050, title: "Master", description: "Expert knowledge", isActive: true },
  { level: 8, minPoints: 1400, title: "Champion", description: "Outstanding achievement", isActive: true },
  { level: 9, minPoints: 1800, title: "Legend", description: "Legendary dedication", isActive: true },
  { level: 10, minPoints: 2250, title: "Grand Master", description: "The pinnacle of learning", isActive: true },
];

/**
 * Default points configuration
 */
export const DEFAULT_POINTS_CONFIG: Omit<PointsConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  sectionPoints: {
    easy: 2,
    intermediate: 3,
    advanced: 5
  },
  quizPoints: {
    easy: 1,
    intermediate: 2,
    advanced: 4  },
  finalQuizPoints: {
    easy: 2,
    intermediate: 3,
    advanced: 5
  }
};
