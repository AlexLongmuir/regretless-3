import React, { createContext, useContext, useMemo, useCallback, useState } from 'react'
import type { Dream, Area, Action, ActionWithDueDate } from '../backend/database/types'
import type { FeasibilityResponse, GoalFeasibilityResponse, TimelineFeasibilityResponse, DreamImage } from '../frontend-services/backend-bridge'

// Create dream state types
export interface CreateDreamState {
  // Dream data
  dreamId?: string
  title: string
  description?: string
  start_date?: string | null
  end_date?: string | null
  image_url?: string | null
  figurineUrl?: string | null // For generating personalized images
  
  // Form data collected during creation
  baseline?: string // What's your current progress
  obstacles?: string // What's most likely going to cause you not to achieve this
  enjoyment?: string // What's most likely to cause you to enjoy the journey
  timeCommitment?: { hours: number; minutes: number } // Daily time commitment
  
  // AI analysis results
  goalFeasibility?: GoalFeasibilityResponse
  timelineFeasibility?: TimelineFeasibilityResponse
  goalFeasibilityAnalyzed?: boolean // Track if goal feasibility analysis has been completed
  timelineFeasibilityAnalyzed?: boolean // Track if timeline feasibility analysis has been completed
  originalTitleForFeasibility?: string // Store original title when feasibility was generated
  originalEndDateForFeasibility?: string // Store original end date when feasibility was generated
  originalTimeCommitmentForFeasibility?: { hours: number; minutes: number } // Store original time commitment when feasibility was generated
  areasAnalyzed?: boolean // Track if areas analysis has been completed
  
  // Legacy fields for backward compatibility
  feasibility?: FeasibilityResponse
  feasibilityAnalyzed?: boolean
  
  // Generated content
  areas: Area[]
  actions: ActionWithDueDate[]
  
  // Preloaded images
  preloadedDefaultImages: DreamImage[] | null
}

export interface CreateDreamActions {
  // Core state setters
  setField: <K extends keyof CreateDreamState>(key: K, value: CreateDreamState[K]) => void
  
  // Specialized setters for complex data
  setAreas: (areas: Area[]) => void
  addArea: (area: Area) => void
  updateArea: (areaId: string, updates: Partial<Area>) => void
  removeArea: (areaId: string) => void
  
  setActions: (actions: ActionWithDueDate[]) => void
  addAction: (action: ActionWithDueDate) => void
  updateAction: (actionId: string, updates: Partial<ActionWithDueDate>) => void
  removeAction: (actionId: string) => void
  
  // Utility
  reset: () => void
  
  // Feasibility analysis
  setGoalFeasibilityAnalyzed: (analyzed: boolean) => void
  setTimelineFeasibilityAnalyzed: (analyzed: boolean) => void
  
  // Legacy feasibility analysis
  setFeasibilityAnalyzed: (analyzed: boolean) => void
  
  // Areas analysis
  setAreasAnalyzed: (analyzed: boolean) => void
  
  // Preloaded images
  setPreloadedDefaultImages: (images: DreamImage[] | null) => void
}

type CreateDreamContextType = CreateDreamState & CreateDreamActions

const initialState: CreateDreamState = {
  title: '',
  areas: [],
  actions: [],
  preloadedDefaultImages: null
}

const CreateDreamContext = createContext<CreateDreamContextType | null>(null)

export function useCreateDream() {
  const context = useContext(CreateDreamContext)
  if (!context) {
    throw new Error('useCreateDream must be used within a CreateDreamProvider')
  }
  return context
}

export const CreateDreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CreateDreamState>(initialState)

  const setField = useCallback(<K extends keyof CreateDreamState>(key: K, value: CreateDreamState[K]) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  const setAreas = useCallback((areas: Area[]) => {
    setState(prev => {
      // Check if area IDs have changed
      const prevAreaIds = new Set(prev.areas.map(a => a.id))
      const newAreaIds = new Set(areas.map(a => a.id))
      const areasChanged = 
        prevAreaIds.size !== newAreaIds.size ||
        ![...newAreaIds].every(id => prevAreaIds.has(id))
      
      // If areas changed, clear actions since they reference old areas
      if (areasChanged) {
        return { ...prev, areas, actions: [] }
      }
      
      return { ...prev, areas }
    })
  }, [])

  const addArea = useCallback((area: Area) => {
    setState(prev => ({ ...prev, areas: [...prev.areas, area] }))
  }, [])

  const updateArea = useCallback((areaId: string, updates: Partial<Area>) => {
    setState(prev => ({
      ...prev,
      areas: prev.areas.map(area => 
        area.id === areaId ? { ...area, ...updates } : area
      )
    }))
  }, [])

  const removeArea = useCallback((areaId: string) => {
    setState(prev => ({
      ...prev,
      areas: prev.areas.filter(area => area.id !== areaId),
      // Also remove actions that belong to this area
      actions: prev.actions.filter(action => action.area_id !== areaId)
    }))
  }, [])

  const setActions = useCallback((actions: ActionWithDueDate[]) => {
    setState(prev => ({ ...prev, actions }))
  }, [])

  const addAction = useCallback((action: ActionWithDueDate) => {
    setState(prev => ({ ...prev, actions: [...prev.actions, action] }))
  }, [])

  const updateAction = useCallback((actionId: string, updates: Partial<ActionWithDueDate>) => {
    setState(prev => ({
      ...prev,
      actions: prev.actions.map(action => 
        action.id === actionId ? { ...action, ...updates } : action
      )
    }))
  }, [])

  const removeAction = useCallback((actionId: string) => {
    setState(prev => ({
      ...prev,
      actions: prev.actions.filter(action => action.id !== actionId)
    }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const setGoalFeasibilityAnalyzed = useCallback((analyzed: boolean) => {
    setState(prev => ({ ...prev, goalFeasibilityAnalyzed: analyzed }))
  }, [])

  const setTimelineFeasibilityAnalyzed = useCallback((analyzed: boolean) => {
    setState(prev => ({ ...prev, timelineFeasibilityAnalyzed: analyzed }))
  }, [])

  const setFeasibilityAnalyzed = useCallback((analyzed: boolean) => {
    setState(prev => ({ ...prev, feasibilityAnalyzed: analyzed }))
  }, [])

  const setAreasAnalyzed = useCallback((analyzed: boolean) => {
    setState(prev => ({ ...prev, areasAnalyzed: analyzed }))
  }, [])

  const setPreloadedDefaultImages = useCallback((images: DreamImage[] | null) => {
    setState(prev => ({ ...prev, preloadedDefaultImages: images }))
  }, [])

  const value = useMemo(() => ({
    ...state,
    setField,
    setAreas,
    addArea,
    updateArea,
    removeArea,
    setActions,
    addAction,
    updateAction,
    removeAction,
    reset,
    setGoalFeasibilityAnalyzed,
    setTimelineFeasibilityAnalyzed,
    setFeasibilityAnalyzed,
    setAreasAnalyzed,
    setPreloadedDefaultImages
  }), [
    state,
    setField,
    setAreas,
    addArea,
    updateArea,
    removeArea,
    setActions,
    addAction,
    updateAction,
    removeAction,
    reset,
    setGoalFeasibilityAnalyzed,
    setTimelineFeasibilityAnalyzed,
    setFeasibilityAnalyzed,
    setAreasAnalyzed,
    setPreloadedDefaultImages
  ])

  return (
    <CreateDreamContext.Provider value={value}>
      {children}
    </CreateDreamContext.Provider>
  )
}


