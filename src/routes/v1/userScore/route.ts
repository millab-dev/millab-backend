import { Router } from "express";
import { UserScoreService } from "../../../services/userScore.service";

const router = Router();
const userScoreService = new UserScoreService();

// Get user score
router.get("/:userId", async (req, res) => {
    try {
        const userScore = await userScoreService.getUserScore(req.params.userId);
        res.json(userScore);
    } catch (error) {
        res.status(500).json({ error: "Failed to get user score" });
    }
});

// Update user score
router.put("/:userId", async (req, res) => {
    try {
        const { score } = req.body;
        if (typeof score !== "number") {
            return res.status(400).json({ error: "Score must be a number" });
        }
        const userScore = await userScoreService.updateUserScore(req.params.userId, score);
        res.json(userScore);
    } catch (error) {
        res.status(500).json({ error: "Failed to update user score" });
    }
});

// Add score to user
router.post("/:userId/add", async (req, res) => {
    try {
        const { score } = req.body;
        if (typeof score !== "number") {
            return res.status(400).json({ error: "Score must be a number" });
        }
        const userScore = await userScoreService.addScore(req.params.userId, score);
        res.json(userScore);
    } catch (error) {
        res.status(500).json({ error: "Failed to add score" });
    }
});

// Get all user scores
router.get("/", async (req, res) => {
    try {
        const userScores = await userScoreService.getAllUserScores();
        res.json(userScores);
    } catch (error) {
        res.status(500).json({ error: "Failed to get all user scores" });
    }
});

// Delete user score
router.delete("/:userId", async (req, res) => {
    try {
        await userScoreService.deleteUserScore(req.params.userId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete user score" });
    }
});

// Reset all scores
router.post("/reset", async (req, res) => {
    try {
        await userScoreService.resetAllScores();
        res.status(200).json({ message: "All scores have been reset" });
    } catch (error) {
        res.status(500).json({ error: "Failed to reset scores" });
    }
});

export default router; 