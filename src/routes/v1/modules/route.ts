import { Elysia, t } from "elysia";
import { moduleService } from "../../../services/module.service";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { requireAdmin } from "../../../middlewares/admin.middleware";
import { jwtService } from "../../../services/jwt.service";
import { UserReadingStateService } from "../../../services/userReadingState.service";

const userReadingStateService = new UserReadingStateService();

export const moduleRoutes = new Elysia({ prefix: "/modules" })
  // Public routes (no auth required, but supports auth users)
  .get("/", async ({ request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      
      const modules = await moduleService.getModulesWithProgress(userId || undefined);
      return {
        success: true,
        data: modules,
      };
    } catch (error: any) {
      console.error("Get modules error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch modules",
      };
    }
  })

  // Get homepage modules (public access)
  .get("/homepage", async ({ request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      
      const modules = await moduleService.getHomepageModules(userId || undefined);
      return {
        success: true,
        data: modules,
      };
    } catch (error: any) {
      console.error("Get homepage modules error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch homepage modules",
      };
    }
  })
  .get("/:id", async ({ params: { id }, request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      
      const module = await moduleService.getModuleWithProgress(id, userId || undefined);
      if (!module) {
        return {
          success: false,
          error: "Module not found",
        };
      }

      // Track module access for reading state (only if user is authenticated)
      if (userId) {
        try {
          await userReadingStateService.updateUserModuleAccess(userId, id);
        } catch (error) {
          // Don't fail the request if tracking fails
          console.error("Failed to track module access:", error);
        }
      }

      return {
        success: true,
        data: module,
      };
    } catch (error: any) {
      console.error("Get module error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch module",
      };
    }
  })
  
  // Auth required routes
  .use(authMiddleware)
  .post("/:id/sections/:sectionId/complete", async ({ params: { id, sectionId }, request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        set.status = 401;
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const progress = await moduleService.markSectionCompleted(userId, id, sectionId);
      return {
        success: true,
        data: progress,
      };
    } catch (error: any) {
      console.error("Mark section completed error:", error);
      
      // Set appropriate HTTP status codes for different error types
      if (error.message?.includes("already completed")) {
        set.status = 400;
      } else if (error.message?.includes("not found")) {
        set.status = 404;
      } else if (error.message?.includes("not active")) {
        set.status = 400;
      } else if (error.message?.includes("Cannot complete more sections")) {
        set.status = 400;
      } else {
        set.status = 500;
      }
      
      return {
        success: false,
        error: error.message || "Failed to mark section as completed",
      };
    }
  })
  .post("/:id/quiz/complete", async ({ params: { id }, body, request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const { score } = body as { score: number };
      const progress = await moduleService.markQuizCompleted(userId, id, score);
      return {
        success: true,
        data: progress,
      };
    } catch (error: any) {
      console.error("Mark quiz completed error:", error);
      return {
        success: false,
        error: error.message || "Failed to mark quiz as completed",
      };
    }
  }, {
    body: t.Object({
      score: t.Number({ minimum: 0, maximum: 100 }),
    }),
  })
  .get("/progress/all", async ({ request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const progress = await moduleService.getUserProgress(userId);
      return {
        success: true,
        data: progress,
      };
    } catch (error: any) {
      console.error("Get user progress error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch user progress",
      };
    }
  })
  .get("/:id/progress", async ({ params: { id }, request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const progress = await moduleService.getUserModuleProgress(userId, id);
      return {
        success: true,
        data: progress,
      };    } catch (error: any) {
      console.error("Get module progress error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch module progress",
      };
    }
  })
    // Submit quiz completion
  .post("/:id/progress/quiz", async ({ params: { id }, body, request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const { score, completed } = body;
      
      // Update module progress with quiz completion
      const progress = await moduleService.markQuizCompleted(userId, id, score);
      
      return {
        success: true,
        data: progress,
        message: "Quiz completed successfully",
      };
    } catch (error: any) {
      console.error("Update quiz progress error:", error);
      return {
        success: false,
        error: error.message || "Failed to update quiz progress",
      };
    }
  }, {
    body: t.Object({
      score: t.Number({ minimum: 0, maximum: 100 }),
      completed: t.Boolean(),
    }),
  })

  // Admin routes
  .use(requireAdmin)
  .get("/admin/all", async () => {
    try {
      const modules = await moduleService.getAllModules();
      return {
        success: true,
        data: modules,
      };
    } catch (error: any) {
      console.error("Get all modules error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch all modules",
      };
    }
  })
  .post("/admin/create", async ({ body }) => {
    try {
      const module = await moduleService.createModule(body as any);
      return {
        success: true,
        data: module,
      };
    } catch (error: any) {
      console.error("Create module error:", error);
      return {
        success: false,
        error: error.message || "Failed to create module",
      };
    }  }, {    body: t.Object({
      title: t.String({ minLength: 1 }),
      titleEn: t.Optional(t.String()),
      description: t.String({ minLength: 1 }),
      descriptionEn: t.Optional(t.String()),
      difficulty: t.Union([t.Literal('Easy'), t.Literal('Intermediate'), t.Literal('Advanced')]),
      order: t.Number({ minimum: 0 }),
      pdfUrl: t.Optional(t.String()),
      pdfUrlEn: t.Optional(t.String()),
      sections: t.Array(t.Object({
        title: t.String({ minLength: 1 }),
        titleEn: t.Optional(t.String()),
        content: t.String({ minLength: 1 }),
        contentEn: t.Optional(t.String()),
        duration: t.String({ minLength: 1 }),
        order: t.Number({ minimum: 0 }),
        isActive: t.Boolean(),
      })),quiz: t.Object({
        title: t.String({ minLength: 1 }),
        titleEn: t.Optional(t.String()),
        description: t.String({ minLength: 1 }),
        descriptionEn: t.Optional(t.String()),
        duration: t.String({ minLength: 1 }),
        totalQuestions: t.Number({ minimum: 1 }),
        questions: t.Array(t.Object({
          question: t.String({ minLength: 1 }),
          questionEn: t.Optional(t.String()),
          type: t.Union([t.Literal('multiple-choice'), t.Literal('true-false')]),
          options: t.Array(t.String({ minLength: 1 })),
          optionsEn: t.Optional(t.Array(t.String())),
          correctAnswer: t.Number({ minimum: 0 }),
          explanation: t.Optional(t.String()),
          explanationEn: t.Optional(t.String()),
          order: t.Number({ minimum: 1 }),
        }), { minItems: 1 }),
        isActive: t.Boolean(),
      }),
      isActive: t.Boolean(),
    }),
  })
  .put("/admin/:id", async ({ params: { id }, body }) => {
    try {
      const module = await moduleService.updateModule(id, body as any);
      return {
        success: true,
        data: module,
      };
    } catch (error: any) {
      console.error("Update module error:", error);
      return {
        success: false,
        error: error.message || "Failed to update module",
      };
    }  }, {    body: t.Object({
      title: t.Optional(t.String({ minLength: 1 })),
      titleEn: t.Optional(t.String()),
      description: t.Optional(t.String({ minLength: 1 })),
      descriptionEn: t.Optional(t.String()),
      difficulty: t.Optional(t.Union([t.Literal('Easy'), t.Literal('Intermediate'), t.Literal('Advanced')])),
      order: t.Optional(t.Number({ minimum: 0 })),
      pdfUrl: t.Optional(t.String()),
      pdfUrlEn: t.Optional(t.String()),
      sections: t.Optional(t.Array(t.Object({
        title: t.String({ minLength: 1 }),
        titleEn: t.Optional(t.String()),
        content: t.String({ minLength: 1 }),
        contentEn: t.Optional(t.String()),
        duration: t.String({ minLength: 1 }),
        order: t.Number({ minimum: 0 }),
        isActive: t.Boolean(),
      }))),quiz: t.Optional(t.Object({
        title: t.String({ minLength: 1 }),
        titleEn: t.Optional(t.String()),
        description: t.String({ minLength: 1 }),
        descriptionEn: t.Optional(t.String()),
        duration: t.String({ minLength: 1 }),
        totalQuestions: t.Number({ minimum: 1 }),
        questions: t.Optional(t.Array(t.Object({
          question: t.String({ minLength: 1 }),
          questionEn: t.Optional(t.String()),
          type: t.Union([t.Literal('multiple-choice'), t.Literal('true-false')]),
          options: t.Array(t.String({ minLength: 1 })),
          optionsEn: t.Optional(t.Array(t.String())),
          correctAnswer: t.Number({ minimum: 0 }),
          explanation: t.Optional(t.String()),
          explanationEn: t.Optional(t.String()),
          order: t.Number({ minimum: 1 }),
        }), { minItems: 1 })),
        isActive: t.Boolean(),
      })),
      isActive: t.Optional(t.Boolean()),
    }),
  })

  .delete("/admin/:id", async ({ params: { id } }) => {
    try {
      const success = await moduleService.deleteModule(id);
      return {
        success,
        message: success ? "Module deleted successfully" : "Failed to delete module",
      };
    } catch (error: any) {
      console.error("Delete module error:", error);
      return {
        success: false,
        error: error.message || "Failed to delete module",
      };
    }
  });
