/**
 * Backend Bridge Service
 * 
 * This service provides a React Native-compatible interface to backend AI functionality.
 * It makes HTTP requests to the backend API endpoints.
 */

import type { Dream, Area, Action } from '../backend/database/types'

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
    // Add timeout to fetch request (60 seconds for AI generation)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    
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
      console.log('⏱️ [BACKEND-BRIDGE] Request timeout after 60s')
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

export const updateActionOccurrence = (occurrenceId: string, updates: { note?: string; due_on?: string }, token?: string): Promise<{ success: boolean; data: any; message: string }> => 
  put('/api/action-occurrences/update', { occurrenceId, updates }, token)

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