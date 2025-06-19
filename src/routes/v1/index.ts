import { Elysia } from 'elysia'
import { healthRoutes } from './health/route'
import { authRoutes } from './auth/route'
import { quizRoutes } from './quiz/route'
import { userScoreRoutes } from './userScore/route'
import { moduleRoutes } from './modules/route'
import { readingStateRoutes } from './reading-state/route'
import { progressionRoutes } from './progression/route'
import { appSettingsRoutes } from './settings/route'

// Combine all v1 routes
export const v1Routes = new Elysia({ prefix: '/v1' })
  .use(healthRoutes)
  .use(authRoutes)
  .use(quizRoutes)
  .use(userScoreRoutes)
  .use(moduleRoutes)
  .use(readingStateRoutes)
  .use(progressionRoutes)
  .use(appSettingsRoutes)
