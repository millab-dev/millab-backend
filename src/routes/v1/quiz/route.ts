import { Elysia, t } from "elysia";
import { quizService } from "../../../services/quiz.service";

// Define validation schemas
const QuizOptionSchema = t.Object({
    option: t.String({ minLength: 1 }),
    isCorrect: t.Boolean(),
});

const QuizQuestionSchema = t.Object({
    question: t.String({ minLength: 1 }),
    options: t.Array(QuizOptionSchema, { minItems: 4, maxItems: 4 }),
});

const CreateQuizSchema = t.Object({
    title: t.String({ minLength: 1 }),
    isModule: t.Boolean(),
    isFinalQuiz: t.Boolean(),
    moduleId: t.Optional(t.String()),
    difficulty: t.Optional(t.String()),
    questions: t.Array(QuizQuestionSchema, { minItems: 1 }),
});

const UpdateQuizSchema = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    isModule: t.Optional(t.Boolean()),
    isFinalQuiz: t.Optional(t.Boolean()),
    moduleId: t.Optional(t.String()),
    difficulty: t.Optional(t.String()),
    questions: t.Optional(t.Array(QuizQuestionSchema, { minItems: 1 })),
});

const SubmitAnswersSchema = t.Object({
    answers: t.Record(t.String(), t.Number({ minimum: 0, maximum: 3 })),
});

export const quizRoutes = new Elysia({ prefix: "/quizzes" })
    // Create a new quiz
    .post("/", async ({ body, set }) => {
        try {
            const quizData = {
                ...body,
                moduleId: body.moduleId || undefined,
                difficulty: body.difficulty || undefined,
            };
            const quiz = await quizService.createQuiz(quizData);
            set.status = 201;
            return {
                success: true,
                message: "Quiz created successfully",
                data: quiz,
            };
        } catch (error) {
            set.status = 400;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to create quiz",
                data: null,
            };
        }
    }, {
        body: CreateQuizSchema,
        detail: {
            summary: "Create a new quiz",
            description: "Create a new quiz with questions and options. Each question must have exactly 4 options with only 1 correct answer.",
            tags: ["Quiz"],
        },
    })

    // Get all quizzes
    .get("/", async ({ set }) => {
        try {
            const quizzes = await quizService.getAllQuizzes();
            return {
                success: true,
                message: "Quizzes retrieved successfully",
                data: quizzes,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to get quizzes",
                data: null,
            };
        }
    }, {
        detail: {
            summary: "Get all quizzes",
            description: "Retrieve all quizzes from the database",
            tags: ["Quiz"],
        },
    })

    // Get quiz by ID
    .get("/:id", async ({ params, set }) => {
        try {
            const quiz = await quizService.getQuizById(params.id);
            
            if (!quiz) {
                set.status = 404;
                return {
                    success: false,
                    message: "Quiz not found",
                    data: null,
                };
            }

            return {
                success: true,
                message: "Quiz retrieved successfully",
                data: quiz,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to get quiz",
                data: null,
            };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        detail: {
            summary: "Get quiz by ID",
            description: "Retrieve a specific quiz by its ID",
            tags: ["Quiz"],
        },
    })

    // Update quiz
    .put("/:id", async ({ params, body, set }) => {
        try {
            const updatedQuiz = await quizService.updateQuiz(params.id, body);
            return {
                success: true,
                message: "Quiz updated successfully",
                data: updatedQuiz,
            };
        } catch (error) {
            if (error instanceof Error && error.message.includes("not found")) {
                set.status = 404;
            } else {
                set.status = 400;
            }
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to update quiz",
                data: null,
            };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        body: UpdateQuizSchema,
        detail: {
            summary: "Update quiz",
            description: "Update an existing quiz. Validation rules still apply for questions and options.",
            tags: ["Quiz"],
        },
    })

    // Delete quiz
    .delete("/:id", async ({ params, set }) => {
        try {
            const deleted = await quizService.deleteQuiz(params.id);
            
            if (!deleted) {
                set.status = 404;
                return {
                    success: false,
                    message: "Quiz not found",
                    data: null,
                };
            }

            return {
                success: true,
                message: "Quiz deleted successfully",
                data: { deleted: true },
            };
        } catch (error) {
            if (error instanceof Error && error.message.includes("not found")) {
                set.status = 404;
            } else {
                set.status = 500;
            }
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to delete quiz",
                data: null,
            };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        detail: {
            summary: "Delete quiz",
            description: "Delete a quiz by its ID",
            tags: ["Quiz"],
        },
    })

    // Get quizzes by module ID
    .get("/module/:moduleId", async ({ params, set }) => {
        try {
            const quizzes = await quizService.getQuizzesByModuleId(params.moduleId);
            return {
                success: true,
                message: "Module quizzes retrieved successfully",
                data: quizzes,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to get module quizzes",
                data: null,
            };
        }
    }, {
        params: t.Object({
            moduleId: t.String(),
        }),
        detail: {
            summary: "Get quizzes by module ID",
            description: "Retrieve all quizzes for a specific module",
            tags: ["Quiz"],
        },
    })

    // Get all module quizzes
    .get("/module", async ({ set }) => {
        try {
            const quizzes = await quizService.getModuleQuizzes();
            return {
                success: true,
                message: "Module quizzes retrieved successfully",
                data: quizzes,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to get module quizzes",
                data: null,
            };
        }
    }, {
        detail: {
            summary: "Get all module quizzes",
            description: "Retrieve all quizzes where isModule is true",
            tags: ["Quiz"],
        },
    })

    // Get all final quizzes
    .get("/final", async ({ set }) => {
        try {
            const quizzes = await quizService.getFinalQuizzes();
            return {
                success: true,
                message: "Final quizzes retrieved successfully",
                data: quizzes,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to get final quizzes",
                data: null,
            };
        }
    }, {
        detail: {
            summary: "Get all final quizzes",
            description: "Retrieve all quizzes where isFinalQuiz is true",
            tags: ["Quiz"],
        },
    })

    // Get quizzes by difficulty
    .get("/difficulty/:difficulty", async ({ params, set }) => {
        try {
            const quizzes = await quizService.getQuizzesByDifficulty(params.difficulty);
            return {
                success: true,
                message: "Quizzes retrieved successfully",
                data: quizzes,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to get quizzes by difficulty",
                data: null,
            };
        }
    }, {
        params: t.Object({
            difficulty: t.String(),
        }),
        detail: {
            summary: "Get quizzes by difficulty",
            description: "Retrieve all quizzes with a specific difficulty level",
            tags: ["Quiz"],
        },
    })

    // Submit quiz answers and get score
    .post("/:id/submit", async ({ params, body, set }) => {
        try {
            // Get the quiz
            const quiz = await quizService.getQuizById(params.id);
            
            if (!quiz) {
                set.status = 404;
                return {
                    success: false,
                    message: "Quiz not found",
                    data: null,
                };
            }

            // Convert string keys to number keys for validation
            const userAnswers: { [questionIndex: number]: number } = {};
            for (const [key, value] of Object.entries(body.answers)) {
                const questionIndex = parseInt(key);
                if (isNaN(questionIndex)) {
                    set.status = 400;
                    return {
                        success: false,
                        message: "Answer keys must be valid question indices",
                        data: null,
                    };
                }
                userAnswers[questionIndex] = value;
            }

            // Validate answers
            quizService.validateAnswers(quiz, userAnswers);

            // Calculate score
            const result = quizService.calculateScore(quiz, userAnswers);

            return {
                success: true,
                message: "Quiz submitted successfully",
                data: {
                    quizId: quiz.id,
                    quizTitle: quiz.title,
                    score: result.score,
                    totalQuestions: result.totalQuestions,
                    correctAnswers: result.correctAnswers,
                    percentage: result.percentage,
                    details: result.details,
                    submittedAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            if (error instanceof Error && error.message.includes("not found")) {
                set.status = 404;
            } else {
                set.status = 400;
            }
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to submit quiz",
                data: null,
            };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        body: SubmitAnswersSchema,
        detail: {
            summary: "Submit quiz answers",
            description: "Submit answers for a quiz and get the calculated score. Answers should be provided as question index (0-based) to option index (0-3) mapping.",
            tags: ["Quiz"],
        },
    })

    // Get quiz without correct answers (for taking the quiz)
    .get("/:id/take", async ({ params, set }) => {
        try {
            const quiz = await quizService.getQuizById(params.id);
            
            if (!quiz) {
                set.status = 404;
                return {
                    success: false,
                    message: "Quiz not found",
                    data: null,
                };
            }

            // Remove correct answer information for security
            const sanitizedQuiz = {
                ...quiz,
                questions: quiz.questions.map(question => ({
                    question: question.question,
                    options: question.options.map(option => ({
                        option: option.option,
                        // Don't include isCorrect field
                    }))
                }))
            };

            return {
                success: true,
                message: "Quiz retrieved for taking",
                data: sanitizedQuiz,
            };
        } catch (error) {
            set.status = 500;
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to get quiz",
                data: null,
            };
        }
    }, {
        params: t.Object({
            id: t.String(),
        }),
        detail: {
            summary: "Get quiz for taking",
            description: "Retrieve a quiz without correct answer information, suitable for quiz-taking interface",
            tags: ["Quiz"],
        },
    });
