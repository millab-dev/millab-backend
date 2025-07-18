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
    }  })

  // Check quiz attempt status (for warnings)
  .get('/quiz-attempt-status/:source/:sourceId', async ({ params, request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      const { source, sourceId } = params
      const validSources = ['module_quiz', 'final_quiz', 'section_read']
      
      if (!validSources.includes(source)) {
        set.status = 400
        return { success: false, error: 'Invalid source type' }
      }

      const status = await pointsService.getQuizAttemptStatus(
        userId, 
        source as 'module_quiz' | 'final_quiz' | 'section_read', 
        sourceId
      )

      const response: ApiResponse<any> = {
        success: true,
        data: status
      }

      return response
    } catch (error) {
      console.error('Error checking quiz attempt status:', error)
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to check quiz attempt status'
      }
      return response
    }
  }, {
    params: t.Object({
      source: t.String(),
      sourceId: t.String()
    })
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
      console.log('Award points request:', { userId, sectionId, moduleDifficulty });      try {        const result = await pointsService.addPointsForSection(userId, sectionId, moduleDifficulty)

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

      // Check first attempt status from Firebase
      const attemptStatus = await pointsService.getQuizAttemptStatus(userId, 'module_quiz', quizId)
      const actualIsFirstAttempt = attemptStatus.isFirstAttempt

      let pointsGained = 0
      let message = 'Quiz completed!'      // Award points only for actual first attempt
      if (actualIsFirstAttempt) {
        pointsGained = await pointsService.calculateModuleQuizPoints(
          moduleDifficulty, 
          score
        )
        await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'module_quiz', quizId, moduleDifficulty)
        
        // Mark as attempted in Firebase
        await pointsService.markAsAttempted(userId, 'module_quiz', quizId)
        
        message = `Kamu mendapatkan ${pointsGained} poin!`
      } else {
        message = 'Kamu sudah mengerjakan kuis ini, tidak ada poin yang diperoleh.'
      }

      const response: ApiResponse<any> = {
        success: true,
        message,
        data: {
          pointsGained,
          isFirstAttempt: actualIsFirstAttempt
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
      }
      
      const { finalQuizId, score, maxScore, isFirstAttempt, difficulty = 'intermediate' } = body
        // Check first attempt status from Firebase
      const attemptStatus = await pointsService.getQuizAttemptStatus(userId, 'final_quiz', finalQuizId)
      const actualIsFirstAttempt = attemptStatus.isFirstAttempt

      let pointsGained = 0
      let message = 'Kuis final selesai!'

      // Award points only for actual first attempt
      if (actualIsFirstAttempt) {
        pointsGained = await pointsService.calculateFinalQuizPoints(
          score, 
          difficulty as 'easy' | 'intermediate' | 'advanced'
        )
        await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'final_quiz', finalQuizId)
        
        // Mark as attempted in Firebase
        await pointsService.markAsAttempted(userId, 'final_quiz', finalQuizId)
        
        message = `Kamu mendapatkan ${pointsGained} poin!`
      } else {
        message = 'Kamu sudah mengerjakan kuis ini, tidak ada poin yang diperoleh.'
      }

      const response: ApiResponse<any> = {
        success: true,
        message,
        data: {
          pointsGained,
          isFirstAttempt: actualIsFirstAttempt
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
      // Check first attempt status from Firebase
    const attemptStatus = await pointsService.getQuizAttemptStatus(userId, 'module_quiz', quizId)
    const actualIsFirstAttempt = attemptStatus.isFirstAttempt

    let pointsGained = 0
    let message = 'Kuis selesai!'

    if (actualIsFirstAttempt) {
      pointsGained = await pointsService.calculateModuleQuizPoints(moduleDifficulty, score)
      await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'module_quiz', quizId, moduleDifficulty)
      
      // Mark as attempted in Firebase
      await pointsService.markAsAttempted(userId, 'module_quiz', quizId)
      
      message = `Kamu mendapatkan ${pointsGained} poin!`
    } else {
      message = 'Kamu sudah mengerjakan kuis ini, tidak ada poin yang diperoleh.'
    }

    return {
      success: true,
      message,
      data: {
        expGained: 0, // Keep for compatibility
        pointsGained,
        isFirstAttempt: actualIsFirstAttempt
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
      // Check first attempt status from Firebase
    const attemptStatus = await pointsService.getQuizAttemptStatus(userId, 'final_quiz', finalQuizId)
    const actualIsFirstAttempt = attemptStatus.isFirstAttempt

    let pointsGained = 0
    let message = 'Kuis final selesai!'

    if (actualIsFirstAttempt) {
      pointsGained = await pointsService.calculateFinalQuizPoints(
        score, 
        difficulty as 'easy' | 'intermediate' | 'advanced'
      )
      await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'final_quiz', finalQuizId)
      
      // Mark as attempted in Firebase
      await pointsService.markAsAttempted(userId, 'final_quiz', finalQuizId)
      
      message = `Kamu mendapatkan ${pointsGained} poin!`
    } else {
      message = 'Kamu sudah mengerjakan kuis ini, tidak ada poin yang diperoleh.'
    }

    return {
      success: true,
      message,
      data: {
        expGained: 0, // Keep for compatibility
        pointsGained,
        isFirstAttempt: actualIsFirstAttempt
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
