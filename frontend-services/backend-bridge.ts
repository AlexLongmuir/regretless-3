/**
 * Backend Bridge Service
 * 
 * This service provides a React Native-compatible interface to backend AI functionality.
 * It makes HTTP requests to the backend API endpoints.
 */

import { supabaseClient } from '../lib/supabaseClient'
import type { Dream, Area, Action, Achievement, UserAchievement, AchievementUnlockResult } from '../backend/database/types'

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL! // e.g. https://api.yourapp.com

// API Request/Response Types
export interface UpsertDreamRequest {
  id?: string
  title: string
  start_date?: string | null
  end_date?: string | null
  image_url?: string | null
  baseline?: string | null
  obstacles?: string | null
  enjoyment?: string | null
  time_commitment?: { hours: number; minutes: number } | null
}

export interface UpsertDreamResponse {
  id: string
}

export interface GoalFeasibilityRequest {
  title: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
}

export interface TimelineFeasibilityRequest {
  title: string
  start_date?: string
  end_date?: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
  timeCommitment: {
    hours: number
    minutes: number
  }
}

export interface TitleSuggestion {
  title: string
  emoji: string
  reasoning: string
}

export interface DateAnalysis {
  assessment: string
  suggestedEndDate: string
  reasoning: string
}

export interface GoalFeasibilityResponse {
  summary: string
  titleSuggestions: TitleSuggestion[]
}

export interface TimelineFeasibilityResponse {
  assessment: string
  suggestedEndDate: string
  reasoning: string
}

// Legacy types for backward compatibility
export interface FeasibilityRequest {
  title: string
  start_date?: string
  end_date?: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
}

export interface FeasibilityResponse {
  summary: string
  titleSuggestions: TitleSuggestion[]
  dateAnalysis: DateAnalysis
}

export interface GenerateAreasRequest {
  dream_id: string
  title: string
  start_date?: string
  end_date?: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
  feedback?: string
  original_areas?: Area[]
  figurine_url?: string
}

export interface GenerateActionsRequest {
  dream_id: string
  title: string
  start_date?: string
  end_date?: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
  timeCommitment?: { hours: number; minutes: number }
  areas: Area[]
  feedback?: string
  original_actions?: Action[]
}

// Onboarding-specific types (unauthenticated - uses same endpoints)
export interface OnboardingGenerateAreasRequest {
  title: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
  dream_id?: string // Optional for onboarding
  feedback?: string
  original_areas?: Area[]
  figurine_url?: string
}

export interface OnboardingGenerateActionsRequest {
  title: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
  timeCommitment?: { hours: number; minutes: number }
  areas: Area[]
  dream_id?: string // Optional for onboarding
  feedback?: string
  original_actions?: Action[]
}

export interface ActivateDreamRequest {
  dream_id: string
}

export interface UpsertAreasRequest {
  dream_id: string
  areas: (Area | Omit<Area, 'id'>)[]
}

export interface UpsertAreasResponse {
  areas: Area[]
}

export interface UpsertActionsRequest {
  dream_id: string
  actions: (Action | Omit<Action, 'id'>)[]
}

export interface UpsertActionsResponse {
  actions: Action[]
}

async function post(path: string, body: unknown, token?: string) {
  // Normalize URL to avoid double slashes
  const baseUrl = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${baseUrl}${normalizedPath}`
  
  console.log('🌐 [BACKEND-BRIDGE] Making API call:', {
    url,
    hasToken: !!token,
    body: JSON.stringify(body, null, 2)
  })
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  try {
    // Add timeout to fetch request (120 seconds for AI generation - actions can take longer)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000)
    
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    console.log('📡 [BACKEND-BRIDGE] Response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] API Error:', errorText)
      throw new Error(errorText)
    }
    
    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] API Success:', result)
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('⏱️ [BACKEND-BRIDGE] Request timeout after 120s')
      throw new Error('Request timeout - the server took too long to respond')
    }
    console.log('💥 [BACKEND-BRIDGE] Network/Parse Error:', error)
    throw error
  }
}

async function del(path: string, token?: string, body?: any) {
  console.log('🌐 [BACKEND-BRIDGE] Making DELETE API call:', {
    url: `${API_BASE}${path}`,
    hasToken: !!token,
    body
  })
  
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
    
    console.log('📡 [BACKEND-BRIDGE] Response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] API Error:', errorText)
      throw new Error(errorText)
    }
    
    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] API Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Network/Parse Error:', error)
    throw error
  }
}

async function put(path: string, body: any, token?: string) {
  console.log('🌐 [BACKEND-BRIDGE] Making PUT API call:', {
    url: `${API_BASE}${path}`,
    hasToken: !!token,
    body
  })
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    })
    
    console.log('📡 [BACKEND-BRIDGE] Response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] API Error:', errorText)
      throw new Error(errorText)
    }
    
    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] API Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Network/Parse Error:', error)
    throw error
  }
}

async function patch(path: string, body: unknown, token?: string) {
  console.log('🌐 [BACKEND-BRIDGE] Making PATCH API call:', {
    url: `${API_BASE}${path}`,
    hasToken: !!token,
    body: JSON.stringify(body, null, 2)
  })
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    })
    
    console.log('📡 [BACKEND-BRIDGE] Response status:', res.status)
    
    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] API Error:', errorText)
      throw new Error(errorText)
    }
    
    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] API Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Network/Parse Error:', error)
    throw error
  }
}

export const upsertDream = (body: UpsertDreamRequest, token?: string): Promise<UpsertDreamResponse> => 
  post('/api/dreams', body, token)

export const runGoalFeasibility = (body: GoalFeasibilityRequest, token?: string): Promise<GoalFeasibilityResponse> => 
  post('/api/create/goal-feasibility', body, token)

export const runTimelineFeasibility = (body: TimelineFeasibilityRequest, token?: string): Promise<TimelineFeasibilityResponse> => 
  post('/api/create/timeline-feasibility', body, token)

// Legacy function for backward compatibility
export const runFeasibility = (body: FeasibilityRequest, token?: string): Promise<FeasibilityResponse> => 
  post('/api/create/feasibility', body, token)

export const generateAreas = (body: GenerateAreasRequest, token?: string): Promise<Area[]> => 
  post('/api/create/generate-areas', body, token)

export const generateActions = (body: GenerateActionsRequest, token?: string): Promise<Action[]> => 
  post('/api/create/generate-actions', body, token)

// Onboarding-specific functions (unauthenticated - uses same endpoints)
export const generateOnboardingAreas = (body: OnboardingGenerateAreasRequest): Promise<Area[]> => 
  post('/api/create/generate-areas', body) // No token = unauthenticated mode

export const generateOnboardingActions = (body: OnboardingGenerateActionsRequest): Promise<Action[]> => 
  post('/api/create/generate-actions', body) // No token = unauthenticated mode

export interface SyncOnboardingRequest {
  sessionId: string;
  data: any;
  deviceId?: string;
}

export const syncOnboardingDraft = (body: SyncOnboardingRequest): Promise<{ success: boolean }> =>
  post('/api/onboarding/sync', body)

export const getOnboardingDraft = (sessionId: string): Promise<{ data: any }> =>
  fetch(`${API_BASE}/api/onboarding/sync?sessionId=${sessionId}`).then(res => res.json())

export const activateDream = (body: ActivateDreamRequest, token?: string): Promise<{ success: boolean; message?: string; error?: string; scheduling?: any }> =>  
  post('/api/create/activate-dream', body, token)

export const upsertAreas = (body: UpsertAreasRequest, token?: string): Promise<UpsertAreasResponse> => 
  post('/api/areas', body, token)

export const upsertActions = (body: UpsertActionsRequest, token?: string): Promise<UpsertActionsResponse> => 
  post('/api/actions', body, token)

export const deleteDream = (dreamId: string, token?: string): Promise<{ success: boolean }> => 
  del(`/api/dreams?id=${dreamId}`, token)

export const archiveDream = (dreamId: string, token?: string): Promise<{ success: boolean }> => 
  patch('/api/dreams', { id: dreamId, action: 'archive' }, token)

export const unarchiveDream = (dreamId: string, token?: string): Promise<{ success: boolean }> => 
  patch('/api/dreams', { id: dreamId, action: 'unarchive' }, token)

export const deferOccurrence = (occurrenceId: string, newDueDate: string, token?: string): Promise<{ success: boolean; data: any; message: string }> => 
  post('/api/action-occurrences/defer', { occurrenceId, newDueDate }, token)

export const scheduleActions = (dreamId: string, token?: string): Promise<{ success: boolean; scheduled_count: number; warnings?: string[] }> => 
  post('/api/create/schedule-actions', { dream_id: dreamId }, token)

export const rescheduleActions = (dreamId: string, token?: string, options?: { extendEndDate?: string; contractEndDate?: string; resetCompleted?: boolean; timeCommitment?: { hours: number; minutes: number } }): Promise<{ success: boolean; scheduled_count: number; warnings?: string[] }> => 
  post('/api/create/reschedule-actions', { dream_id: dreamId, extend_end_date: options?.extendEndDate, contract_end_date: options?.contractEndDate, reset_completed: options?.resetCompleted, time_commitment: options?.timeCommitment }, token)

export const deleteAccount = (token?: string): Promise<{ success: boolean; message?: string; error?: string }> => 
  del('/api/account/delete', token)

export const deleteActionOccurrence = (occurrenceId: string, token?: string): Promise<{ success: boolean; message: string }> => 
  del('/api/action-occurrences/delete', token, { occurrenceId })

export const updateActionOccurrence = (occurrenceId: string, updates: { note?: string; due_on?: string; completed_at?: string | null }, token?: string): Promise<{ success: boolean; data: any; message: string }> => 
  put('/api/action-occurrences/update', { occurrenceId, updates }, token)

export const unmarkOccurrence = (occurrenceId: string, token?: string): Promise<{ success: boolean; data: any; message: string }> => 
  updateActionOccurrence(occurrenceId, { completed_at: null }, token)

export const updateAction = (actionId: string, updates: { title?: string; est_minutes?: number; difficulty?: string; repeat_every_days?: number; slice_count_target?: number; acceptance_criteria?: { title: string; description: string }[] }, token?: string): Promise<{ success: boolean; data: any; message: string }> => 
  put('/api/actions/update', { actionId, updates }, token)

export const updateArea = (areaId: string, updates: { title?: string; icon?: string; position?: number }, token?: string): Promise<{ success: boolean; data: any; message: string }> => 
  put('/api/areas/update', { areaId, updates }, token)

export const deleteArea = (areaId: string, token?: string): Promise<{ success: boolean; message: string }> => 
  del('/api/areas/delete', token, { areaId })

// Artifact-related functions
export interface Artifact {
  id: string
  occurrence_id: string
  storage_path: string
  file_name: string
  file_size: number
  mime_type: string
  metadata: any
  created_at: string
  signed_url?: string
}

export interface ArtifactsResponse {
  occurrence: {
    id: string
    note: string | null
    completed_at: string | null
    ai_rating: number | null
    ai_feedback: string | null
  }
  artifacts: Artifact[]
}

export const uploadArtifact = async (file: any, occurrenceId: string, token: string, replaceArtifactId?: string): Promise<{ success: boolean; data: Artifact; message: string }> => {
  const formData = new FormData()
  
  // Handle React Native file upload
  if (file.uri) {
    // For React Native, append the file with proper structure
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any)
  } else {
    // For web, use the file directly
    formData.append('file', file)
  }
  
  formData.append('occurrenceId', occurrenceId)
  if (replaceArtifactId) {
    formData.append('replaceArtifactId', replaceArtifactId)
  }

  console.log('🌐 [BACKEND-BRIDGE] Uploading artifact:', {
    fileName: file.name,
    fileSize: file.size,
    occurrenceId,
    replaceArtifactId
  })

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${API_BASE}/api/action-occurrences/artifacts/upload`, {
      method: 'POST',
      headers,
      body: formData
    })

    console.log('📡 [BACKEND-BRIDGE] Upload response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] Upload Error:', errorText)
      throw new Error(errorText)
    }

    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] Upload Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Upload Network/Parse Error:', error)
    throw error
  }
}

export const getArtifacts = (occurrenceId: string, token: string): Promise<{ success: boolean; data: ArtifactsResponse }> => {
  console.log('🌐 [BACKEND-BRIDGE] Getting artifacts for occurrence:', occurrenceId)
  
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${API_BASE}/api/action-occurrences/artifacts/${occurrenceId}`, {
    method: 'GET',
    headers
  })
    .then(async (res) => {
      console.log('📡 [BACKEND-BRIDGE] Get artifacts response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.log('❌ [BACKEND-BRIDGE] Get artifacts Error:', errorText)
        throw new Error(errorText)
      }
      
      const result = await res.json()
      console.log('✅ [BACKEND-BRIDGE] Get artifacts Success:', result)
      return result
    })
    .catch((error) => {
      console.log('💥 [BACKEND-BRIDGE] Get artifacts Network/Parse Error:', error)
      throw error
    })
}

export const deleteArtifact = (artifactId: string, token: string): Promise<{ success: boolean; message: string }> => 
  del('/api/action-occurrences/artifacts/delete', token, { artifactId })

export const completeOccurrence = (occurrenceId: string, note?: string, token?: string): Promise<{ success: boolean; data: any; message: string }> => 
  post('/api/action-occurrences/artifacts', { occurrenceId, note }, token)

export interface AIReviewRequest {
  occurrenceId: string;
  note?: string;
  artifacts?: Artifact[];
}

export interface AIReviewResponse {
  success: boolean;
  data: {
    rating: number;
    feedback: string;
  };
}

export const generateAIReview = (body: AIReviewRequest, token: string): Promise<AIReviewResponse> => 
  post('/api/action-occurrences/artifacts/review', body, token)

// Dream Image Upload Types
export interface DreamImage {
  id: string;
  name: string;
  signed_url: string;
  content_type: string;
  size: number;
}

export interface DefaultImagesResponse {
  images: DreamImage[];
}

export interface DreamImageUploadResponse {
  id: string;
  path: string;
  signed_url: string;
  content_type: string;
  size: number;
}

// Celebrity & Dreamboard types
export interface CelebrityProfile {
  id: string;
  name: string;
  image_url?: string;
  signed_url?: string;
  description?: string;
  category?: string;
}

export interface GeneratedDreamSuggestion {
  id?: string;
  title: string;
  emoji?: string;
  source_type?: 'celebrity' | 'dreamboard';
  source_data?: any;
  created_at?: string;
}

// Dream Image Functions
export const getDefaultImages = (token: string): Promise<{ success: boolean; data: DefaultImagesResponse; message: string }> => {
  console.log('🌐 [BACKEND-BRIDGE] Getting default images');
  
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${API_BASE}/api/dreams/default-images`, {
    method: 'GET',
    headers
  })
    .then(async (res) => {
      console.log('📡 [BACKEND-BRIDGE] Get default images response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.log('❌ [BACKEND-BRIDGE] Get default images Error:', errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }
      
      const result = await res.json()
      console.log('✅ [BACKEND-BRIDGE] Get default images Success:', result)
      return result
    })
    .catch((error) => {
      console.log('💥 [BACKEND-BRIDGE] Get default images Network/Parse Error:', error)
      // Return a more structured error response
      return {
        success: false,
        data: { images: [] },
        message: error.message || 'Failed to load default images'
      }
    })
}

export const getDefaultImagesPublic = (): Promise<{ success: boolean; data: DefaultImagesResponse; message: string }> => {
  console.log('🌐 [BACKEND-BRIDGE] Getting default images (public)');
  
  return fetch(`${API_BASE}/api/dreams/default-images-public`, {
    method: 'GET',
  })
    .then(async (res) => {
      console.log('📡 [BACKEND-BRIDGE] Get default images (public) response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.log('❌ [BACKEND-BRIDGE] Get default images (public) Error:', errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }
      
      const result = await res.json()
      console.log('✅ [BACKEND-BRIDGE] Get default images (public) Success:', result)
      return result
    })
    .catch((error) => {
      console.log('💥 [BACKEND-BRIDGE] Get default images (public) Network/Parse Error:', error)
      // Return a more structured error response
      return {
        success: false,
        data: { images: [] },
        message: error.message || 'Failed to load default images'
      }
    })
}

export const uploadDreamImage = async (file: any, dreamId: string, token: string): Promise<{ success: boolean; data: DreamImageUploadResponse; message: string }> => {
  const formData = new FormData()
  
  // Handle React Native file upload
  if (file.uri) {
    // For React Native, append the file with proper structure
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any)
  } else {
    // For web, use the file directly
    formData.append('file', file)
  }
  
  formData.append('dreamId', dreamId)

  console.log('🌐 [BACKEND-BRIDGE] Uploading dream image:', {
    fileName: file.name,
    fileSize: file.size,
    dreamId
  })

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${API_BASE}/api/dreams/upload-image`, {
      method: 'POST',
      headers,
      body: formData
    })

    console.log('📡 [BACKEND-BRIDGE] Upload dream image response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] Upload dream image Error:', errorText)
      throw new Error(errorText)
    }

    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] Upload dream image Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Upload dream image Network/Parse Error:', error)
    throw error
  }
}

// Celebrity & Dreamboard API
export const getDefaultCelebrities = async (): Promise<{ success: boolean; data: { celebrities: CelebrityProfile[] } }> => {
  const res = await fetch(`${API_BASE}/api/dreams/celebrities/default`, { method: 'GET' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Figurine API
export interface Figurine {
  id: string;
  name: string;
  signed_url: string;
  path: string;
}

export const uploadSelfieForFigurine = async (file: any, token: string): Promise<{ success: boolean; data: DreamImageUploadResponse; message: string }> => {
  const formData = new FormData()
  
  // Handle React Native file upload
  if (file.uri) {
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any)
  } else {
    formData.append('file', file)
  }

  console.log('🌐 [BACKEND-BRIDGE] Uploading selfie for figurine generation')

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  }

  try {
    const res = await fetch(`${API_BASE}/api/figurines/upload-selfie`, {
      method: 'POST',
      headers,
      body: formData
    })

    console.log('📡 [BACKEND-BRIDGE] Upload selfie response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] Upload selfie Error:', errorText)
      throw new Error(errorText)
    }

    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] Upload selfie Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Upload selfie Network/Parse Error:', error)
    throw error
  }
}

export const getPrecreatedFigurines = async (token?: string): Promise<{ success: boolean; data: { figurines: Figurine[] } }> => {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  console.log('🌐 [BACKEND-BRIDGE] Getting precreated figurines')

  try {
    const res = await fetch(`${API_BASE}/api/figurines/precreated`, {
      method: 'GET',
      headers
    })

    console.log('📡 [BACKEND-BRIDGE] Get precreated figurines response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] Get precreated figurines Error:', errorText)
      throw new Error(errorText)
    }

    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] Get precreated figurines Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Get precreated figurines Network/Parse Error:', error)
    throw error
  }
}

export const generateDreamImage = async (figurineUrl: string, dreamTitle: string, dreamContext: string, dreamId: string, token: string): Promise<{ success: boolean; data: DreamImageUploadResponse }> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  console.log('🌐 [BACKEND-BRIDGE] Generating dream image')

  try {
    const res = await fetch(`${API_BASE}/api/dreams/generate-image`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        figurine_url: figurineUrl,
        dream_title: dreamTitle,
        dream_context: dreamContext,
        dream_id: dreamId
      })
    })

    console.log('📡 [BACKEND-BRIDGE] Generate dream image response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] Generate dream image Error:', errorText)
      throw new Error(errorText)
    }

    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] Generate dream image Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Generate dream image Network/Parse Error:', error)
    throw error
  }
}

export const generateAreaImage = async (figurineUrl: string, dreamTitle: string, areaTitle: string, areaContext: string, areaId: string, token: string): Promise<{ success: boolean; data: DreamImageUploadResponse }> => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:815',message:'generateAreaImage called',data:{hasFigurineUrl:!!figurineUrl,hasDreamTitle:!!dreamTitle,hasAreaTitle:!!areaTitle,hasAreaId:!!areaId,areaId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  console.log('🌐 [BACKEND-BRIDGE] Generating area image')

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:824',message:'About to fetch area image API',data:{url:`${API_BASE}/api/areas/generate-image`,hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const res = await fetch(`${API_BASE}/api/areas/generate-image`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        figurine_url: figurineUrl,
        dream_title: dreamTitle,
        area_title: areaTitle,
        area_context: areaContext,
        area_id: areaId
      })
    })

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:836',message:'Area image API response received',data:{status:res.status,statusText:res.statusText,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('📡 [BACKEND-BRIDGE] Generate area image response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:838',message:'Area image API error response',data:{status:res.status,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('❌ [BACKEND-BRIDGE] Generate area image Error:', errorText)
      throw new Error(errorText)
    }

    const result = await res.json()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:844',message:'Area image API success',data:{success:result.success,hasData:!!result.data,hasSignedUrl:!!result.data?.signed_url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('✅ [BACKEND-BRIDGE] Generate area image Success:', result)
    return result
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:848',message:'Area image API network/parse error',data:{error:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.log('💥 [BACKEND-BRIDGE] Generate area image Network/Parse Error:', error)
    throw error
  }
}

export const generateCelebrityDreams = async (name: string, token?: string): Promise<{ success: boolean; data: { dreams: GeneratedDreamSuggestion[] } }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/dreams/celebrities/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ custom_name: name })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Onboarding version (unauthenticated)
export const generateOnboardingCelebrityDreams = async (name: string): Promise<{ success: boolean; data: { dreams: GeneratedDreamSuggestion[] } }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}/api/dreams/celebrities/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ custom_name: name })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const analyzeDreamboard = async (file: any, token?: string): Promise<{ success: boolean; data: { dreams: GeneratedDreamSuggestion[]; image_url?: string } }> => {
  const formData = new FormData();
  // React Native style
  if (file?.uri) {
    formData.append('file', { uri: file.uri, type: file.type || 'image/jpeg', name: file.name || 'dreamboard.jpg' } as any);
  } else {
    formData.append('file', file);
  }
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/dreams/dreamboard/analyze`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Onboarding version (unauthenticated)
export const analyzeOnboardingDreamboard = async (file: any): Promise<{ success: boolean; data: { dreams: GeneratedDreamSuggestion[]; image_url?: string } }> => {
  const formData = new FormData();
  // React Native style
  if (file?.uri) {
    formData.append('file', { uri: file.uri, type: file.type || 'image/jpeg', name: file.name || 'dreamboard.jpg' } as any);
  } else {
    formData.append('file', file);
  }
  const headers: Record<string, string> = {};
  const res = await fetch(`${API_BASE}/api/dreams/dreamboard/analyze`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const getGeneratedDreams = async (token: string, sourceType?: 'celebrity' | 'dreamboard'): Promise<{ success: boolean; data: { dreams: GeneratedDreamSuggestion[] } }> => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = new URL(`${API_BASE}/api/dreams/generated`);
  if (sourceType) url.searchParams.set('source_type', sourceType);
  const res = await fetch(url.toString(), { method: 'GET', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Audio Transcription Types
export interface TranscribeAudioResponse {
  success: boolean
  data: { text: string }
  message?: string
  error?: string
}

export const transcribeAudio = async (file: any, token?: string): Promise<TranscribeAudioResponse> => {
  const formData = new FormData()
  
  // Handle React Native file upload
  if (file.uri) {
    // For React Native, append the file with proper structure
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any)
  } else {
    // For web, use the file directly
    formData.append('file', file)
  }

  console.log('🎤 [BACKEND-BRIDGE] Transcribing audio:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    authenticated: !!token
  })

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST',
      headers,
      body: formData
    })

    console.log('📡 [BACKEND-BRIDGE] Transcribe audio response status:', res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.log('❌ [BACKEND-BRIDGE] Transcribe audio Error:', errorText)
      throw new Error(errorText)
    }

    const result = await res.json()
    console.log('✅ [BACKEND-BRIDGE] Transcribe audio Success:', result)
    return result
  } catch (error) {
    console.log('💥 [BACKEND-BRIDGE] Transcribe audio Network/Parse Error:', error)
    throw error
  }
}

// Achievements API

export interface AchievementsResponse {
  achievements: (Achievement & {
    user_progress?: UserAchievement | null
  })[]
}

export const getAchievements = async (token: string): Promise<{ success: boolean; data: AchievementsResponse; message: string }> => {
  // Using Supabase Client directly for now as per plan scope
  try {
    const { data: achievements, error: achievementsError } = await supabaseClient
      .from('achievements')
      .select('*')

    if (achievementsError) throw achievementsError

    const { data: userAchievements, error: userError } = await supabaseClient
      .from('user_achievements')
      .select('*')
      .eq('user_id', (await supabaseClient.auth.getUser()).data.user?.id)

    if (userError) throw userError

    // Merge data
    const merged = achievements.map(ach => ({
      ...ach,
      user_progress: userAchievements?.find(ua => ua.achievement_id === ach.id) || null
    }))

    // Sort by category first, then by criteria_value (numerical order)
    // Category order: action_count, dream_count, streak
    const categoryOrder = { 'action_count': 0, 'dream_count': 1, 'streak': 2, 'area_count': 3 }
    const sorted = merged.sort((a, b) => {
      const categoryDiff = (categoryOrder[a.category as keyof typeof categoryOrder] || 999) - (categoryOrder[b.category as keyof typeof categoryOrder] || 999)
      if (categoryDiff !== 0) return categoryDiff
      return a.criteria_value - b.criteria_value
    })

    return { success: true, data: { achievements: sorted }, message: 'Success' }
  } catch (error: any) {
    return { success: false, data: { achievements: [] }, message: error.message }
  }
}

/**
 * Check for newly unlocked achievements
 * 
 * This function checks the database for achievements that have been unlocked
 * since the user last checked. It can be called from anywhere in the app:
 * - When a dream is completed (DreamCompletedPage)
 * - When an action is completed (currently not active - achievements trigger on dream completion)
 * - For testing purposes (AccountPage)
 * - Any other appropriate trigger point
 * 
 * The modal will appear above all other UI when new achievements are found.
 * Achievements are automatically unlocked when criteria are met (e.g., completing
 * 1, 10, 100 actions, completing dreams, maintaining streaks, etc.)
 */
export const checkNewAchievements = async (token: string): Promise<{ success: boolean; data: { new_achievements: AchievementUnlockResult[] }; message: string }> => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:874',message:'Calling RPC check_new_achievements',data:{hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    const { data, error } = await supabaseClient.rpc('check_new_achievements')
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:877',message:'RPC response received',data:{hasData:!!data,hasError:!!error,errorCode:error?.code,errorMessage:error?.message,dataLength:data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    
    if (error) throw error
    
    // Map response to match expected interface (handling mapped column names)
    const mappedData = data?.map((item: any) => ({
      achievement_id: item.unlocked_id || item.achievement_id,
      title: item.unlocked_title || item.title,
      description: item.unlocked_description || item.description,
      image_url: item.unlocked_image_url || item.image_url || ''
    })) || []
    
    return { success: true, data: { new_achievements: mappedData }, message: 'Success' }
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend-bridge.ts:882',message:'RPC call error',data:{errorCode:error?.code,errorMessage:error?.message,errorDetails:error?.details,errorHint:error?.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    return { success: false, data: { new_achievements: [] }, message: error.message }
  }
}

export const markAchievementsSeen = async (achievementIds: string[], token: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabaseClient
      .from('user_achievements')
      .update({ seen: true })
      .in('achievement_id', achievementIds)
      .eq('user_id', (await supabaseClient.auth.getUser()).data.user?.id)

    if (error) throw error
    return { success: true, message: 'Success' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
