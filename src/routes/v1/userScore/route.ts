
import { UserScoreService } from "../../../services/userScore.service";
import Elysia, { t } from "elysia";

const userScoreService = new UserScoreService();

export const userScoreRoutes = new Elysia({ prefix: "/user-scores" })
    // Get user score
    .get("/:userId", async ({ params, set }) => {
        try {
            const userScore = await userScoreService.getUserScore(params.userId);
            set.status = 200;
            return {
                success: true,
                message: "User score fetched successfully",
                data: userScore,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: "Failed to get user score",
                data: null,
            };
        }
    }, {
    })

    // Update user score
    .put("/:userId", async ({ params, body, set }) => {
        try {
            const { score } = body;
            if (typeof score !== "number") {
                set.status = 400;
                return {
                    success: false,
                    message: "Score must be a number",
                    data: null,
                };
            }
            const userScore = await userScoreService.updateUserScore(params.userId, score);
            set.status = 200;
            return {
                success: true,
                message: "User score updated successfully",
                data: userScore,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: "Failed to update user score",
                data: null,
            };
        }
    }, {
        body: t.Object({
            score: t.Number(),
        }),
    })

    // Add score to user
    .post("/:userId/add", async ({ params, body, set }) => {
        try {
            const { score } = body;
            if (typeof score !== "number") {
                set.status = 400;
                return {
                    success: false,
                    message: "Score must be a number",
                    data: null,
                };
            }
            const userScore = await userScoreService.addScore(params.userId, score);
            set.status = 200;
            return {
                success: true,
                message: "Score added successfully",
                data: userScore,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                    message: "Failed to add score",
                data: null,
            };
        }
    }, {
        body: t.Object({
            score: t.Number(),
        }),
    })

    // Get all user scores
    .get("/", async ({ set }) => {
        try {
            const userScores = await userScoreService.getAllUserScores();
            set.status = 200;
            return {
                success: true,
                message: "User scores fetched successfully",
                data: userScores,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: "Failed to delete user score",
                data: null,
            };
        }
    }, {
    })

    // Reset all scores
    .post("/reset", async ({ set }) => {
        try {
            await userScoreService.resetAllScores();
            set.status = 200;
            return {
                success: true,
                message: "All scores have been reset",
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: "Failed to reset scores",
                data: null,
            };
        }
    })