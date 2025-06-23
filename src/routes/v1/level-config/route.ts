import { Elysia, t } from "elysia";
import { requireAdmin } from "../../../middlewares/admin.middleware";
import { levelConfigService } from "../../../services/levelConfig.service";

export const levelConfigRoutes = new Elysia({ prefix: "/level-config" })
  .use(requireAdmin)
  
  // Initialize default configurations
  .post("/init", async ({ set }) => {
    try {
      await levelConfigService.initializeDefaults();
      return {
        success: true,
        message: 'Default configurations initialized successfully'
      };
    } catch (error) {
      console.error('Error initializing default configurations:', error);
      set.status = 500;
      return {
        success: false,
        error: 'Failed to initialize default configurations'
      };
    }
  })

  // Get all level configurations
  .get("/levels", async ({ set }) => {
    const result = await levelConfigService.getAllLevels();
    if (!result.success) {
      set.status = 500;
    }
    return result;
  })

  // Get points configuration
  .get("/points", async ({ set }) => {
    const result = await levelConfigService.getPointsConfig();
    if (!result.success) {
      set.status = 404;
    }
    return result;
  })

  // Update level configuration
  .put("/levels/:levelId", async ({ params: { levelId }, body, set }) => {
    const result = await levelConfigService.updateLevel(levelId, body);
    if (!result.success) {
      set.status = 400;
    }
    return result;
  }, {
    body: t.Object({
      level: t.Optional(t.Number({ minimum: 1 })),
      minPoints: t.Optional(t.Number({ minimum: 0 })),
      title: t.Optional(t.String({ minLength: 1 })),
      description: t.Optional(t.String()),
      isActive: t.Optional(t.Boolean())
    })
  })

  // Update points configuration
  .put("/points/:configId", async ({ params: { configId }, body, set }) => {
    const result = await levelConfigService.updatePointsConfig(configId, body);
    if (!result.success) {
      set.status = 400;
    }
    return result;
  }, {
    body: t.Object({
      sectionPoints: t.Optional(t.Object({
        easy: t.Number({ minimum: 0 }),
        intermediate: t.Number({ minimum: 0 }),
        advanced: t.Number({ minimum: 0 })
      })),
      quizPoints: t.Optional(t.Object({
        easy: t.Number({ minimum: 0 }),
        intermediate: t.Number({ minimum: 0 }),
        advanced: t.Number({ minimum: 0 })
      })),
      finalQuizPoints: t.Optional(t.Number({ minimum: 0 })),
      firstAttemptBonus: t.Optional(t.Number({ minimum: 1 })),
      streakBonus: t.Optional(t.Object({
        enabled: t.Boolean(),
        streakDays: t.Number({ minimum: 1 }),
        multiplier: t.Number({ minimum: 1 })
      }))
    })
  })

  // Create new level configuration
  .post("/levels", async ({ body, set }) => {
    const result = await levelConfigService.createLevel(body);
    if (!result.success) {
      set.status = 400;
    }
    return result;
  }, {
    body: t.Object({
      level: t.Number({ minimum: 1 }),
      minPoints: t.Number({ minimum: 0 }),
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      isActive: t.Boolean()
    })
  })

  // Delete level configuration
  .delete("/levels/:levelId", async ({ params: { levelId }, set }) => {
    const result = await levelConfigService.deleteLevel(levelId);
    if (!result.success) {
      set.status = 400;
    }
    return result;
  });
