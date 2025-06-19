import { Elysia, t } from 'elysia'
import { ProgressionService } from '../../../services/progression.service'
import { PointsService } from '../../../services/points.service'
import { jwtService } from '../../../services/jwt.service'
import { ApiResponse } from '../../../interface'

const progressionService = new ProgressionService()
const pointsService = new PointsService()

export const progressionRoutes = new Elysia({ prefix: '/progression' })

  // Get user's progression data (XP, level, day streak)
  .get('/me', async ({ request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      const progression = await progressionService.getUserProgression(userId)
      const points = await pointsService.getUserPoints(userId)
      const rank = await pointsService.getUserRank(userId)

      const response: ApiResponse<any> = {
        success: true,
        data: {
          ...progression,
          points,
          rank
        }
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

  // Award XP for section read  // Award XP for section read
  .post('/award-exp/section', async ({ body, request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      const { sectionId, moduleDifficulty } = body
      console.log('Award XP request:', { userId, sectionId, moduleDifficulty });

      // Check if user already gained XP from this section
      const hasAlreadyGained = await progressionService.hasAlreadyGainedExp(
        userId, 
        'section_read', 
        sectionId
      )

      if (hasAlreadyGained) {
        console.log('XP already awarded for section:', sectionId);
        set.status = 400
        const response: ApiResponse<null> = {
          success: false,
          error: 'XP already awarded for this section'
        }
        return response
      }

      const expGain = progressionService.getExpForSectionRead(moduleDifficulty)
      console.log('Awarding XP:', expGain, 'for difficulty:', moduleDifficulty);
      
      const result = await progressionService.addExperience(
        userId, 
        expGain, 
        'section_read', 
        sectionId
      )

      // Update day streak
      await progressionService.updateDayStreak(userId)

      const response: ApiResponse<any> = {
        success: true,
        message: `Gained ${expGain} XP!${result.leveledUp ? ` Level up to ${result.newLevel}!` : ''}`,
        data: {
          expGained: expGain,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
          user: result.user
        }
      }

      console.log('XP awarded successfully:', { expGained: expGain, leveledUp: result.leveledUp });
      return response    } catch (error) {
      console.error('=== ERROR AWARDING SECTION XP ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to award XP'
      }
      return response
    }
  }, {
    body: t.Object({
      sectionId: t.String(),
      moduleDifficulty: t.Enum({ Easy: 'Easy', Intermediate: 'Intermediate', Advanced: 'Advanced' })
    })
  })

  // Award XP and points for quiz attempt
  .post('/award-exp/quiz', async ({ body, request, set }) => {
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

      let expGained = 0
      let pointsGained = 0
      let leveledUp = false
      let newLevel: number | undefined

      // Award XP (only for first 2 attempts)
      const hasReachedExpLimit = await progressionService.hasAlreadyGainedExp(
        userId, 
        'quiz_attempt', 
        quizId, 
        2 // Max 2 attempts for XP
      )

      if (!hasReachedExpLimit) {
        expGained = progressionService.getExpForQuizAttempt(moduleDifficulty, score, maxScore)
        const expResult = await progressionService.addExperience(
          userId, 
          expGained, 
          'quiz_attempt', 
          quizId,
          attemptNumber
        )
        leveledUp = expResult.leveledUp
        newLevel = expResult.newLevel
      }      // Award points (only for first attempt)
      if (isFirstAttempt) {
        pointsGained = pointsService.calculateModuleQuizPoints(moduleDifficulty, score)
        await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'module_quiz', quizId, moduleDifficulty)
      }

      // Update day streak
      await progressionService.updateDayStreak(userId)

      const response: ApiResponse<any> = {
        success: true,
        message: `${expGained > 0 ? `Gained ${expGained} XP!` : ''}${pointsGained > 0 ? ` Earned ${pointsGained} points!` : ''}${leveledUp ? ` Level up to ${newLevel}!` : ''}`,
        data: {
          expGained,
          pointsGained,
          leveledUp,
          newLevel
        }
      }

      return response
    } catch (error) {
      console.error('Error awarding quiz rewards:', error)
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to award quiz rewards'
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

  // Award XP and points for final quiz
  .post('/award-exp/final-quiz', async ({ body, request, set }) => {
    try {
      const userId = jwtService.getUserIdFromCookies(request)
      if (!userId) {
        set.status = 401
        return { success: false, error: 'Authentication required' }
      }

      const { finalQuizId, score, maxScore, isFirstAttempt } = body

      let expGained = 0
      let pointsGained = 0
      let leveledUp = false
      let newLevel: number | undefined

      // Award XP and points only for first attempt
      if (isFirstAttempt) {
        const hasAlreadyGained = await progressionService.hasAlreadyGainedExp(
          userId, 
          'final_quiz', 
          finalQuizId
        )

        if (!hasAlreadyGained) {
          // Award XP (base 50 XP for final quiz)
          const baseExpForFinalQuiz = 50
          const scoreMultiplier = score / maxScore
          expGained = Math.round(baseExpForFinalQuiz * scoreMultiplier)
          
          const expResult = await progressionService.addExperience(
            userId, 
            expGained, 
            'final_quiz', 
            finalQuizId
          )
          leveledUp = expResult.leveledUp
          newLevel = expResult.newLevel

          // Award points (use existing userScore system for final quiz)
          pointsGained = score
          await pointsService.addPointsForFirstAttempt(userId, pointsGained, 'final_quiz', finalQuizId)
        }
      }

      // Update day streak
      await progressionService.updateDayStreak(userId)

      const response: ApiResponse<any> = {
        success: true,
        message: `${expGained > 0 ? `Gained ${expGained} XP!` : ''}${pointsGained > 0 ? ` Earned ${pointsGained} points!` : ''}${leveledUp ? ` Level up to ${newLevel}!` : ''}`,
        data: {
          expGained,
          pointsGained,
          leveledUp,
          newLevel
        }
      }

      return response
    } catch (error) {
      console.error('Error awarding final quiz rewards:', error)
      set.status = 500
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to award final quiz rewards'
      }
      return response
    }
  }, {
    body: t.Object({
      finalQuizId: t.String(),
      score: t.Number(),
      maxScore: t.Number(),
      isFirstAttempt: t.Boolean()
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
  })
