import { Elysia, t } from 'elysia'
import { PointsService } from '../../../services/points.service'
import { jwtService } from '../../../services/jwt.service'
import { levelConfigService } from '../../../services/levelConfig.service'
import { ApiResponse } from '../../../interface'

const pointsService = new PointsService()

export const progressionRoutes = new Elysia({ prefix: '/progression' })

  // Initialize default level configurations (admin only - to be called once)
  .post('/init-defaults', async ({ request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      await levelConfigService.initializeDefaults()
      
      return {
        success: true,
        message: 'Default level configurations initialized'
      }
    } catch (error) {
      console.error('Error initializing defaults:', error)
      set.status = 500
      return { success: false, error: 'Failed to initialize defaults' }
    }
  })

  // Get user's progression data (points-based level, day streak)
  .get('/me', async ({ request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      const progression = await pointsService.getUserProgression(userId)

      const response: ApiResponse<any> = {
        success: true,
        data: progression
      }

      return response
    } catch (error) {
      console.error('Error fetching user progression:', error)
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch user progression'
      }
      return response
    }
  })

  // Award points for section read
  .post('/award-points/section', async ({ body, request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      const { sectionId, moduleDifficulty } = body
      console.log('Award points request:', { userId, sectionId, moduleDifficulty });

      try {        const result = await pointsService.addPointsForSection(userId, sectionId, moduleDifficulty)
        
        // Update day streak
        await pointsService.updateDayStreak(userId)

        const response: ApiResponse<any> = {
          success: true,
          message: `Earned ${result.pointsGained} points for reading this section!`,          data: {
            pointsGained: result.pointsGained,
            levelUp: result.levelUp || false,
            newLevel: result.newLevel
          }
        }

        console.log('Points awarded successfully:', { pointsGained: result.pointsGained });
        return response
      } catch (error) {
        if (error instanceof Error && error.message === 'Points already awarded for this section') {
          console.log('Points already awarded for section:', sectionId);
          set.status = 400
          return {
            success: false,
            error: 'Points already awarded for this section'
          }
        }
        throw error; // Re-throw other errors
      }
    } catch (error) {
      console.error('=== ERROR AWARDING SECTION POINTS ===');
      console.error('Error details:', error);
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to award points'
      }
      return response
    }
  }, {
    body: t.Object({
      sectionId: t.String(),
      moduleDifficulty: t.Enum({ Easy: 'Easy', Intermediate: 'Intermediate', Advanced: 'Advanced' })
    })
  })

  // Award points for quiz attempt
  .post('/award-points/quiz', async ({ body, request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      const { 
        quizId, 
        moduleDifficulty, 
        score, 
        maxScore, 
        attemptNumber,
        isFirstAttempt 
      } = body

      let pointsGained = 0      // Award points (only for first attempt)
      if (isFirstAttempt) {
        // Get user for streak calculation
        const user = await pointsService.updateDayStreak(userId)
        pointsGained = await pointsService.calculateModuleQuizPoints(
          moduleDifficulty, 
          score, 
          isFirstAttempt, 
          user.dayStreak || 0
        )
        await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'module_quiz', quizId, moduleDifficulty)
      }

      const response: ApiResponse<any> = {
        success: true,
        message: pointsGained > 0 ? `Earned ${pointsGained} points!` : 'Quiz completed!',
        data: {
          pointsGained
        }
      }

      return response
    } catch (error) {
      console.error('Error awarding quiz points:', error)
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to award quiz points'
      }
      return response
    }
  }, {
    body: t.Object({
      quizId: t.String(),
      moduleDifficulty: t.Enum({ Easy: 'Easy', Intermediate: 'Intermediate', Advanced: 'Advanced' }),
      score: t.Number(),
      maxScore: t.Number(),
      attemptNumber: t.Number(),
      isFirstAttempt: t.Boolean()
    })
  })

  // Award points for final quiz attempt
  .post('/award-points/final-quiz', async ({ body, request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }      const { finalQuizId, score, maxScore, isFirstAttempt, difficulty = 'intermediate' } = body

      let pointsGained = 0      // Award points only for first attempt
      if (isFirstAttempt) {
        // Get user for streak calculation
        const user = await pointsService.updateDayStreak(userId)
        pointsGained = await pointsService.calculateFinalQuizPoints(
          score, 
          difficulty as 'easy' | 'intermediate' | 'advanced',
          isFirstAttempt, 
          user.dayStreak || 0
        )
        await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'final_quiz', finalQuizId)
      }

      const response: ApiResponse<any> = {
        success: true,
        message: pointsGained > 0 ? `Earned ${pointsGained} points!` : 'Final quiz completed!',
        data: {
          pointsGained
        }
      }

      return response
    } catch (error) {
      console.error('Error awarding final quiz points:', error)
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to award final quiz points'
      }
      return response    }
  }, {
    body: t.Object({
      finalQuizId: t.String(),
      score: t.Number(),
      maxScore: t.Number(),
      isFirstAttempt: t.Boolean(),
      difficulty: t.Optional(t.Union([t.Literal('easy'), t.Literal('intermediate'), t.Literal('advanced')]))
    })
  })

  // Get leaderboard
  .get('/leaderboard', async ({ query, set }) => {
    try {
      const limit = parseInt(query.limit || '10')
      const leaderboard = await pointsService.getLeaderboard(limit)

      const response: ApiResponse<any> = {
        success: true,
        data: leaderboard
      }

      return response
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to fetch leaderboard'
      }
      return response
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String())
    })
  })

  // Legacy XP endpoints (maintain compatibility for now, but redirect to points)
  .post('/award-exp/section', async ({ body, request, set }) => {
    // Redirect to points endpoint
    const userId = jwtService.getUserIdFromCookies(request)
    if (!userId) {
      set.status = 401
      return { success: false, error: 'Authentication required' }
    }

    const { sectionId, moduleDifficulty } = body

    try {
      const result = await pointsService.addPointsForSection(userId, sectionId, moduleDifficulty)
      await pointsService.updateDayStreak(userId)

      return {
        success: true,
        message: `Earned ${result.pointsGained} points for reading this section!`,        data: {
          expGained: result.pointsGained, // Keep old field name for compatibility
          pointsGained: result.pointsGained,
          levelUp: result.levelUp || false,
          newLevel: result.newLevel
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Points already awarded for this section') {
        set.status = 400
        return {
          success: false,
          error: 'Points already awarded for this section'
        }
      }
      
      console.error('Error awarding section points:', error)
      set.status = 500
      return {
        success: false,
        error: 'Failed to award points'
      }
    }
  }, {
    body: t.Object({
      sectionId: t.String(),
      moduleDifficulty: t.Enum({ Easy: 'Easy', Intermediate: 'Intermediate', Advanced: 'Advanced' })
    })
  })

  .post('/award-exp/quiz', async ({ body, request, set }) => {
    // Redirect to points endpoint
    const userId = jwtService.getUserIdFromCookies(request)
    if (!userId) {
      set.status = 401
      return { success: false, error: 'Authentication required' }
    }

    const { quizId, moduleDifficulty, score, maxScore, attemptNumber, isFirstAttempt } = body
    
    let pointsGained = 0

    if (isFirstAttempt) {
      const user = await pointsService.updateDayStreak(userId)
      pointsGained = await pointsService.calculateModuleQuizPoints(moduleDifficulty, score, isFirstAttempt, user.dayStreak || 0)
      await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'module_quiz', quizId, moduleDifficulty)
    }

    return {
      success: true,
      message: pointsGained > 0 ? `Earned ${pointsGained} points!` : 'Quiz completed!',
      data: {
        expGained: 0, // Keep for compatibility
        pointsGained
      }
    }
  }, {
    body: t.Object({
      quizId: t.String(),
      moduleDifficulty: t.Enum({ Easy: 'Easy', Intermediate: 'Intermediate', Advanced: 'Advanced' }),
      score: t.Number(),
      maxScore: t.Number(),
      attemptNumber: t.Number(),
      isFirstAttempt: t.Boolean()
    })
  })

  .post('/award-exp/final-quiz', async ({ body, request, set }) => {
    // Redirect to points endpoint
    const userId = jwtService.getUserIdFromCookies(request)
    if (!userId) {
      set.status = 401
      return { success: false, error: 'Authentication required' }
    }    const { finalQuizId, score, maxScore, isFirstAttempt, difficulty = 'intermediate' } = body
    let pointsGained = 0

    if (isFirstAttempt) {
      const user = await pointsService.updateDayStreak(userId)
      pointsGained = await pointsService.calculateFinalQuizPoints(
        score, 
        difficulty as 'easy' | 'intermediate' | 'advanced',
        isFirstAttempt, 
        user.dayStreak || 0
      )
      await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'final_quiz', finalQuizId)
    }

    return {
      success: true,
      message: pointsGained > 0 ? `Earned ${pointsGained} points!` : 'Final quiz completed!',
      data: {
        expGained: 0, // Keep for compatibility
        pointsGained
      }
    }  }, {
    body: t.Object({
      finalQuizId: t.String(),
      score: t.Number(),
      maxScore: t.Number(),
      isFirstAttempt: t.Boolean(),
      difficulty: t.Optional(t.Union([t.Literal('easy'), t.Literal('intermediate'), t.Literal('advanced')]))
    })
  });
