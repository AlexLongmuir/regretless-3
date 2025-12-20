/**
 * Manual test script for the scheduling system
 * Run with: npx tsx lib/scheduling/test-manual.ts
 */

import { scheduleDreamActions } from './scheduler'
import type { Dream, Area, Action } from '../../database/types'

// Test data
const testDream: Dream = {
  id: 'test-dream-1',
  user_id: 'test-user-1',
  title: 'Learn Guitar',
  description: 'Master the guitar in 3 months',
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  activated_at: undefined,
  image_url: undefined,
  baseline: 'Complete beginner',
  obstacles: 'Limited time',
  enjoyment: 'Love music',
  archived_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const testAreas: Area[] = [
  {
    id: 'area-1',
    dream_id: 'test-dream-1',
    title: 'Practice',
    icon: '🎸',
    position: 1,
    approved_at: '2024-01-01T00:00:00Z',
    deleted_at: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'area-2',
    dream_id: 'test-dream-1',
    title: 'Theory',
    icon: '📚',
    position: 2,
    approved_at: '2024-01-01T00:00:00Z',
    deleted_at: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

const testActions: Action[] = [
  // Practice area actions
  {
    id: 'action-1',
    user_id: 'test-user-1',
    dream_id: 'test-dream-1',
    area_id: 'area-1',
    title: 'Daily practice',
    est_minutes: 30,
    difficulty: 'medium',
    repeat_every_days: 1,
    acceptance_criteria: [{ title: 'Practice for 30 minutes', description: 'Complete a focused 30-minute practice session' }],
    position: 1,
    is_active: true,
    deleted_at: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'action-2',
    user_id: 'test-user-1',
    dream_id: 'test-dream-1',
    area_id: 'area-1',
    title: 'Learn new song',
    est_minutes: 60,
    difficulty: 'hard',
    repeat_every_days: 3,
    acceptance_criteria: [{ title: 'Learn one new song', description: 'Master one complete song from start to finish' }],
    position: 2,
    is_active: true,
    deleted_at: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  // Theory area actions
  {
    id: 'action-3',
    user_id: 'test-user-1',
    dream_id: 'test-dream-1',
    area_id: 'area-2',
    title: 'Study music theory',
    est_minutes: 45,
    difficulty: 'medium',
    repeat_every_days: 2,
    acceptance_criteria: [{ title: 'Study theory for 45 minutes', description: 'Spend 45 minutes learning music theory concepts' }],
    position: 1,
    is_active: true,
    deleted_at: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'action-4',
    user_id: 'test-user-1',
    dream_id: 'test-dream-1',
    area_id: 'area-2',
    title: 'Take lesson',
    est_minutes: 60,
    difficulty: 'easy',
    repeat_every_days: undefined, // One-off
    acceptance_criteria: [{ title: 'Attend guitar lesson', description: 'Complete a guitar lesson session' }],
    position: 2,
    is_active: true,
    deleted_at: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

async function runTest() {
  console.log('🎸 Testing Guitar Learning Dream Scheduling')
  console.log('==========================================')
  
  const context = {
    user_id: 'test-user-1',
    timezone: 'Europe/London'
  }

  const dreamData = {
    dream: testDream,
    areas: testAreas,
    actions: testActions,
    existing_occurrences: []
  }

  try {
    const result = await scheduleDreamActions(context, dreamData)
    
    if (result.success) {
      console.log('✅ Scheduling successful!')
      console.log(`📅 Scheduled ${result.occurrences.length} occurrences`)
      
      if (result.auto_compacted) {
        console.log('📦 Window was auto-compacted')
        console.log(`📅 Recommended end: ${result.recommended_end}`)
      }
      
      if (result.too_tight) {
        console.log('⚠️  Scheduling was tight - some constraints relaxed')
      }
      
      if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:')
        result.warnings.forEach(warning => console.log(`   - ${warning}`))
      }
      
      console.log('\n📋 Scheduled Occurrences:')
      console.log('========================')
      
      // Group by action for better display
      const byAction = new Map<string, typeof result.occurrences>()
      for (const occ of result.occurrences) {
        if (!byAction.has(occ.action_id)) {
          byAction.set(occ.action_id, [])
        }
        byAction.get(occ.action_id)!.push(occ)
      }
      
      for (const [actionId, occurrences] of byAction) {
        const action = testActions.find(a => a.id === actionId)
        const area = testAreas.find(a => a.id === action?.area_id)
        console.log(`\n${area?.icon} ${area?.title} - ${action?.title}`)
        console.log(`   Difficulty: ${action?.difficulty} | Est: ${action?.est_minutes}min`)
        
        const sortedOccs = occurrences.sort((a, b) => 
          new Date(a.due_on).getTime() - new Date(b.due_on).getTime()
        )
        
        for (const occ of sortedOccs) {
          const date = new Date(occ.due_on)
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
          console.log(`   ${dayName} ${occ.due_on} (Occurrence #${occ.occurrence_no})`)
        }
      }
      
      // Check capacity constraints
      console.log('\n🔍 Capacity Analysis:')
      console.log('===================')
      
      const byDate = new Map<string, number>()
      for (const occ of result.occurrences) {
        const count = byDate.get(occ.due_on) || 0
        byDate.set(occ.due_on, count + 1)
      }
      
      let maxDaily = 0
      let sundayCount = 0
      
      for (const [date, count] of byDate) {
        const dayOfWeek = new Date(date).getDay()
        if (dayOfWeek === 0) sundayCount++
        maxDaily = Math.max(maxDaily, count)
        if (count > 5) {
          console.log(`❌ ${date}: ${count} actions (exceeds global cap of 5)`)
        }
      }
      
      console.log(`📊 Max daily actions: ${maxDaily}/5`)
      console.log(`📊 Actions on Sundays: ${sundayCount} (should be 0)`)
      
      if (maxDaily <= 5 && sundayCount === 0) {
        console.log('✅ All capacity constraints satisfied!')
      }
      
    } else {
      console.log('❌ Scheduling failed!')
      console.log('Errors:', result.errors)
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error)
  }
}

// Run the test
runTest().then(() => {
  console.log('\n🏁 Test completed')
}).catch(error => {
  console.error('💥 Test runner failed:', error)
})
