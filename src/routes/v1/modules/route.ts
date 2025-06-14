import { Elysia, t } from "elysia";
import { moduleService } from "../../../services/module.service";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { requireAdmin } from "../../../middlewares/admin.middleware";
import { jwtService } from "../../../services/jwt.service";

export const moduleRoutes = new Elysia({ prefix: "/modules" })
  // Public routes (authenticated users)
  .use(authMiddleware)
  .get("/", async ({ request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const modules = await moduleService.getModulesWithProgress(userId);
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

  .get("/:id", async ({ params: { id }, request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const module = await moduleService.getModuleWithProgress(id, userId);
      if (!module) {
        return {
          success: false,
          error: "Module not found",
        };
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
  .post("/:id/sections/:sectionId/complete", async ({ params: { id, sectionId }, request }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request);
      if (!userId) {
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
      };
    } catch (error: any) {
      console.error("Get module progress error:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch module progress",
      };
    }
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
    }
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.String({ minLength: 1 }),
      order: t.Number({ minimum: 0 }),
      sections: t.Array(t.Object({
        title: t.String({ minLength: 1 }),
        content: t.String({ minLength: 1 }),
        duration: t.String({ minLength: 1 }),
        order: t.Number({ minimum: 0 }),
        pdfUrl: t.Optional(t.String()),
        isActive: t.Boolean(),
      })),
      quiz: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.String({ minLength: 1 }),
        duration: t.String({ minLength: 1 }),
        totalQuestions: t.Number({ minimum: 1 }),
        passingScore: t.Number({ minimum: 0, maximum: 100 }),
        questions: t.Array(t.Object({
          question: t.String({ minLength: 1 }),
          type: t.Union([t.Literal('multiple-choice'), t.Literal('true-false')]),
          options: t.Array(t.String({ minLength: 1 })),
          correctAnswer: t.Number({ minimum: 0 }),
          explanation: t.Optional(t.String()),
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
    }
  }, {
    body: t.Object({
      title: t.Optional(t.String({ minLength: 1 })),
      description: t.Optional(t.String({ minLength: 1 })),
      order: t.Optional(t.Number({ minimum: 0 })),
      sections: t.Optional(t.Array(t.Object({
        title: t.String({ minLength: 1 }),
        content: t.String({ minLength: 1 }),
        duration: t.String({ minLength: 1 }),
        order: t.Number({ minimum: 0 }),
        pdfUrl: t.Optional(t.String()),
        isActive: t.Boolean(),
      }))),
      quiz: t.Optional(t.Object({
        title: t.String({ minLength: 1 }),
        description: t.String({ minLength: 1 }),
        duration: t.String({ minLength: 1 }),
        totalQuestions: t.Number({ minimum: 1 }),
        passingScore: t.Number({ minimum: 0, maximum: 100 }),
        questions: t.Optional(t.Array(t.Object({
          question: t.String({ minLength: 1 }),
          type: t.Union([t.Literal('multiple-choice'), t.Literal('true-false')]),
          options: t.Array(t.String({ minLength: 1 })),
          correctAnswer: t.Number({ minimum: 0 }),
          explanation: t.Optional(t.String()),
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
