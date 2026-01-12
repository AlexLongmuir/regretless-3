/**
 * contexts/DataContext.tsx
 * 
 * This is the main DataContext provider that orchestrates all data management for the app.
 * It provides a centralized state management system with intelligent caching, optimistic updates,
 * and automatic data synchronization.
 * 
 * Key features:
 * - Intelligent caching with TTL-based invalidation
 * - Optimistic updates for immediate UI feedback
 * - Automatic background refresh and data synchronization
 * - Screen focus-based data refresh
 * - User authentication integration
 * - Error handling and fallback mechanisms
 * 
 * The context is designed to provide a fast, responsive user experience while maintaining
 * data consistency and handling network failures gracefully.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabaseClient } from '../lib/supabaseClient';
import { 
  deleteDream as deleteDreamAPI, 
  archiveDream as archiveDreamAPI, 
  unarchiveDream as unarchiveDreamAPI, 
  deferOccurrence as deferOccurrenceAPI, 
  unmarkOccurrence as unmarkOccurrenceAPI,
  updateArea as updateAreaAPI, 
  deleteArea as deleteAreaAPI,
  getAchievements as getAchievementsAPI,
  checkNewAchievements as checkNewAchievementsAPI,
  type AchievementsResponse 
} from '../frontend-services/backend-bridge';
import { useAuthContext } from './AuthContext';
import { type Achievement, type UserAchievement, type AchievementUnlockResult } from '../backend/database/types';
import { 
  CACHE_KEYS, 
  CACHE_TTL, 
  isStale, 
  lastSyncedLabel, 
  loadJSON, 
  saveJSON, 
  clearCache,
  type DreamsSummaryPayload,
  type DreamsWithStatsPayload,
  type TodayPayload,
  type DreamDetailPayload,
  type ProgressPayload
} from './dataCache';
import {
  fetchDreamsSummary,
  fetchDreamsWithStats,
  fetchToday,
  fetchProgress,
  fetchDreamDetail
} from './dataFetchers';
import { getScreenshotMockState } from '../utils/screenshotMockData';

/**
 * TYPE DEFINITIONS
 * 
 * Define the shape of our application state and the context interface.
 */

// Application state structure
type State = {
  dreamsSummary?: DreamsSummaryPayload;     // Basic dreams list
  dreamsWithStats?: DreamsWithStatsPayload; // Dreams with computed statistics
  today?: TodayPayload;                     // Current day's action occurrences
  progress?: ProgressPayload;               // Progress data and photos
  dreamDetail: Record<string, DreamDetailPayload | undefined>; // Individual dream details
  // Store today data for different dates (simplified - only current day)
  todayByDate: Record<string, TodayPayload>;
  loadingTodayByDate: Record<string, boolean>;
  unlockedAchievements: AchievementUnlockResult[]; // Queue of newly unlocked achievements to display
};

// Context interface - defines what's available to consuming components
type Ctx = {
  state: State;
  isScreenshotMode: boolean;
  toggleScreenshotMode: (enabled: boolean) => void;
  
  // Core data management
  loadSnapshot: () => Promise<void>;        // Load cached data on app start
  refresh: (force?: boolean) => Promise<void>; // Refresh all data
  
  // Screen-specific getters (with automatic cache checking)
  getDreamsSummary: (opts?: { force?: boolean }) => Promise<void>;
  getDreamsWithStats: (opts?: { force?: boolean }) => Promise<void>;
  getToday: (opts?: { force?: boolean; date?: Date }) => Promise<void>;
  getProgress: (opts?: { force?: boolean }) => Promise<void>;
  getDreamDetail: (dreamId: string, opts?: { force?: boolean }) => Promise<void>;
  
  // Optimistic writes with background revalidation
  completeOccurrence: (occurrenceId: string) => Promise<void>;
  unmarkOccurrence: (occurrenceId: string) => Promise<void>;
  deferOccurrence: (occurrenceId: string, newDueDate?: string) => Promise<void>;
  deleteDream: (dreamId: string) => Promise<void>;
  archiveDream: (dreamId: string) => Promise<void>;
  unarchiveDream: (dreamId: string) => Promise<void>;
  updateAction: (actionId: string, updates: { title?: string; est_minutes?: number; difficulty?: string; repeat_every_days?: number; slice_count_target?: number; acceptance_criteria?: string[] }) => Promise<void>;
  deleteActionOccurrence: (occurrenceId: string) => Promise<void>;
  updateArea: (areaId: string, updates: { title?: string; icon?: string; position?: number }) => Promise<void>;
  deleteArea: (areaId: string, dreamId: string) => Promise<void>;
  
  // Helper utilities
  isStale: (fetchedAt?: number, ttlMs?: number) => boolean;
  lastSyncedLabel: (fetchedAt?: number) => string;
  clearDreamsWithStatsCache: () => void;
  checkDreamCompletion: (dreamId: string) => Promise<boolean>;
  
  // Achievement checking
  checkAchievements: () => Promise<void>;
  clearUnlockedAchievements: () => void;
  
  // Screen focus tracking for automatic refresh
  onScreenFocus: (screenName: 'today' | 'dreams' | 'dream-detail', dreamId?: string) => void;
};

/**
 * CONTEXT CREATION AND PROVIDER
 * 
 * Create the React context and provide the DataProvider component.
 */

const DataContext = createContext<Ctx | null>(null);

/**
 * DataProvider Component
 * 
 * The main provider component that manages all application state and provides
 * data management functionality to child components.
 */
export const DataProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // Initialize state with empty objects for dynamic keys
  const [state, setState] = useState<State>({ dreamDetail: {}, todayByDate: {}, loadingTodayByDate: {}, unlockedAchievements: [] });
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  
  // Track refresh state and timing
  const lastFetchedAt = useRef<number>(0);    // Timestamp of last successful fetch
  const isRefreshing = useRef<boolean>(false); // Prevent concurrent refreshes
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Auto-refresh interval

  /**
   * CORE DATA MANAGEMENT FUNCTIONS
   * 
   * These functions handle the fundamental data operations like clearing data,
   * refreshing, and loading cached snapshots.
   */

  // Clear all data when user signs out
  const clearAllData = useCallback(() => {
    console.log('Clearing all data due to sign out');
    setState({ dreamDetail: {}, todayByDate: {}, loadingTodayByDate: {}, unlockedAchievements: [] });
    lastFetchedAt.current = 0;
    isRefreshing.current = false;
    
    // Clear auto-refresh interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Clear all cached data from AsyncStorage
    clearCache();
  }, []);

  // Simplified refresh function - handles all data refreshing with smart caching
  const refresh = useCallback(async (force = false) => {
    if (isScreenshotMode) {
      console.log('🔄 Refresh skipped: Screenshot Mode active');
      return;
    }

    if (!isAuthenticated || isRefreshing.current) {
      console.log(`🔄 Refresh skipped:`, { isAuthenticated, isRefreshing: isRefreshing.current });
      return;
    }

    const timeSinceLastFetch = Date.now() - lastFetchedAt.current;
    const shouldRefresh = force || timeSinceLastFetch > CACHE_TTL.MEDIUM;

    if (!shouldRefresh) {
      console.log(`🔄 Refresh skipped: data is fresh (${Math.round(timeSinceLastFetch / 1000)}s ago)`);
      return;
    }

    console.log(`🔄 Starting refresh:`, { 
      force,
      timeSinceLastFetch: Math.round(timeSinceLastFetch / 1000) + 's'
    });
    isRefreshing.current = true;

    try {
        // Global refresh
        console.log(`🔄 Global refresh starting...`);
        await Promise.all([
        getDreamsSummary({ force: true }),
        getDreamsWithStats({ force: true }),
        getToday({ force: true }),
        getProgress({ force: true }),
      ]);
      
      lastFetchedAt.current = Date.now();
      console.log(`✅ Refresh completed successfully`);
    } catch (error) {
      console.error(`❌ Refresh failed:`, error);
    } finally {
      isRefreshing.current = false;
    }
  }, [isAuthenticated]);

  // Load snapshot from cache (used when user becomes authenticated)
  const loadSnapshot = useCallback(async () => {
    console.log('Loading snapshot from cache...');
    
    const [summary, dreamsWithStats, today, progress] = await Promise.all([
      loadJSON<DreamsSummaryPayload>(CACHE_KEYS.dreams),
      loadJSON<DreamsWithStatsPayload>(CACHE_KEYS.dreams),
      loadJSON<TodayPayload>(CACHE_KEYS.today),
      loadJSON<ProgressPayload>(CACHE_KEYS.progress),
    ]);
    
    setState(s => ({ 
      ...s, 
      dreamsSummary: summary, 
      dreamsWithStats: dreamsWithStats,
      today: today ?? s.today,
      progress: progress ?? s.progress,
    }));

    // Set lastFetchedAt to the most recent cache timestamp
    const timestamps = [
      summary?.fetchedAt,
      dreamsWithStats?.fetchedAt,
      today?.fetchedAt,
      progress?.fetchedAt,
    ].filter(Boolean) as number[];
    
    if (timestamps.length > 0) {
      lastFetchedAt.current = Math.max(...timestamps);
    }
    
    console.log('Snapshot loaded, lastFetchedAt:', lastFetchedAt.current);
  }, []);

  // Clear dreams with stats cache to force refresh with new fields
  const clearDreamsWithStatsCache = useCallback(() => {
    console.log('Clearing dreams with stats cache to force refresh');
    setState(s => ({ ...s, dreamsWithStats: undefined }));
    saveJSON(CACHE_KEYS.dreams, undefined);
  }, []);

  // Screen focus tracking - triggers refresh if data is stale
  const onScreenFocus = useCallback((screenName: 'today' | 'dreams' | 'dream-detail', dreamId?: string) => {
    console.log(`📱 Screen focus: ${screenName}`, { dreamId });
    // Simple refresh on screen focus if data is stale
    const timeSinceLastFetch = Date.now() - lastFetchedAt.current;
    if (timeSinceLastFetch > CACHE_TTL.SHORT) {
      refresh();
    }
  }, [refresh]);

  /**
   * DATA GETTERS
   * 
   * These functions provide access to specific data types with intelligent caching.
   * Each getter checks if data is stale and fetches fresh data if needed.
   */

  // Get basic dreams list with caching
  const getDreamsSummary: Ctx['getDreamsSummary'] = useCallback(async ({ force } = {}) => {
    console.log('getDreamsSummary called:', { isAuthenticated, force, fetchedAt: state.dreamsSummary?.fetchedAt });
    
    // Check authentication directly from Supabase instead of relying on closure
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.log('getDreamsSummary: User not authenticated, skipping fetch');
      return;
    }
    
    if (!force && !isStale(state.dreamsSummary?.fetchedAt, CACHE_TTL.MEDIUM)) {
      console.log('getDreamsSummary: Using cached data');
      return;
    }
    console.log('getDreamsSummary: Fetching fresh data');
    const payload = await fetchDreamsSummary();
    console.log('getDreamsSummary: Fetch result:', payload ? 'success' : 'failed');
    if (payload) {
      setState(s => ({ ...s, dreamsSummary: payload }));
      saveJSON(CACHE_KEYS.dreams, payload);
      lastFetchedAt.current = Math.max(lastFetchedAt.current, payload.fetchedAt);
    }
  }, [fetchDreamsSummary, state.dreamsSummary?.fetchedAt]);

  // Get dreams with computed statistics
  const getDreamsWithStats: Ctx['getDreamsWithStats'] = useCallback(async ({ force } = {}) => {
    // Check authentication directly from Supabase instead of relying on closure
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.log('getDreamsWithStats: User not authenticated, skipping fetch');
      return;
    }
    
    console.log('getDreamsWithStats called:', { force, fetchedAt: state.dreamsWithStats?.fetchedAt, isStale: isStale(state.dreamsWithStats?.fetchedAt, CACHE_TTL.MEDIUM) });
    if (!force && !isStale(state.dreamsWithStats?.fetchedAt, CACHE_TTL.MEDIUM)) {
      console.log('getDreamsWithStats: Using cached data');
      return;
    }
    console.log('getDreamsWithStats: Fetching fresh data');
    const payload = await fetchDreamsWithStats();
    if (payload) {
      setState(s => ({ ...s, dreamsWithStats: payload }));
      saveJSON(CACHE_KEYS.dreams, payload);
      lastFetchedAt.current = Math.max(lastFetchedAt.current, payload.fetchedAt);
    }
  }, [fetchDreamsWithStats, state.dreamsWithStats?.fetchedAt]);

  // Get today's action occurrences (supports different dates)
  const getToday: Ctx['getToday'] = useCallback(async ({ force, date } = {}) => {
    // Check authentication directly from Supabase instead of relying on closure
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.log('getToday: User not authenticated, skipping fetch');
      return;
    }
    
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().slice(0, 10);
    const isCurrentDate = dateStr === new Date().toISOString().slice(0, 10);
    
    // For current date, use the legacy 'today' cache, for other dates use date-specific cache
    const cacheKey = isCurrentDate ? CACHE_KEYS.today : `cache:today:${dateStr}`;
    const cachedData = isCurrentDate ? state.today : state.todayByDate[dateStr];
    
    if (!force && !isStale(cachedData?.fetchedAt, CACHE_TTL.SHORT)) {
      console.log(`getToday: Using cached data for ${dateStr}`);
      return;
    }
    
    // Set loading state for non-current dates
    if (!isCurrentDate) {
      setState(s => ({
        ...s,
        loadingTodayByDate: { ...s.loadingTodayByDate, [dateStr]: true }
      }));
    }
    
    console.log(`getToday: Fetching fresh data for ${dateStr}`);
    try {
      const payload = await fetchToday(targetDate);
      if (payload) {
        setState(s => {
          const nextState = { ...s };
          if (isCurrentDate) {
            nextState.today = payload;
          } else {
            nextState.todayByDate = { ...s.todayByDate, [dateStr]: payload };
            nextState.loadingTodayByDate = { ...s.loadingTodayByDate, [dateStr]: false };
          }
          return nextState;
        });
        saveJSON(cacheKey, payload);
        lastFetchedAt.current = Math.max(lastFetchedAt.current, payload.fetchedAt);
      }
    } catch (error) {
      console.error(`Error fetching today data for ${dateStr}:`, error);
      if (!isCurrentDate) {
        setState(s => ({
          ...s,
          loadingTodayByDate: { ...s.loadingTodayByDate, [dateStr]: false }
        }));
      }
    }
  }, [fetchToday, state.today, state.todayByDate]);

  // Get progress data including stats and photos
  const getProgress: Ctx['getProgress'] = useCallback(async ({ force } = {}) => {
    // Check authentication directly from Supabase instead of relying on closure
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.log('getProgress: User not authenticated, skipping fetch');
      return;
    }
    console.log('getProgress called with force:', force, 'isStale:', isStale(state.progress?.fetchedAt, CACHE_TTL.MEDIUM));
    if (!force && !isStale(state.progress?.fetchedAt, CACHE_TTL.MEDIUM)) return;
    const payload = await fetchProgress();
    console.log('getProgress payload:', payload ? 'success' : 'failed');
    if (payload) {
      setState(s => ({ ...s, progress: payload }));
      saveJSON(CACHE_KEYS.progress, payload);
      lastFetchedAt.current = Math.max(lastFetchedAt.current, payload.fetchedAt);
    }
  }, [fetchProgress, state.progress?.fetchedAt]);

  // Get detailed dream information including areas, actions, and occurrences
  const getDreamDetail: Ctx['getDreamDetail'] = useCallback(async (dreamId: string, { force } = {}) => {
    // In screenshot mode, use mock data - don't fetch from backend
    if (isScreenshotMode) {
      console.log('getDreamDetail: Screenshot Mode active, using mock data');
      const mockState = getScreenshotMockState();
      const mockDetail = mockState.dreamDetail[dreamId];
      if (mockDetail) {
        setState(s => ({ ...s, dreamDetail: { ...s.dreamDetail, [dreamId]: mockDetail } }));
      }
      return;
    }
    
    // Check authentication directly from Supabase instead of relying on closure
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.log('getDreamDetail: User not authenticated, skipping fetch');
      return;
    }
    const cached = state.dreamDetail[dreamId];
    if (!force && !isStale(cached?.fetchedAt, CACHE_TTL.MEDIUM)) return;
    const payload = await fetchDreamDetail(dreamId);
    if (payload) {
      setState(s => ({ ...s, dreamDetail: { ...s.dreamDetail, [dreamId]: payload } }));
      saveJSON(CACHE_KEYS.detail(dreamId), payload);
    }
  }, [fetchDreamDetail, state.dreamDetail, isScreenshotMode]);

  /**
   * ACHIEVEMENT CHECKING
   * 
   * Check for newly unlocked achievements and queue them for display
   */
  const checkAchievements = useCallback(async () => {
    if (isScreenshotMode) {
      console.log('⏭️ [ACHIEVEMENT] Skipping check (screenshot mode)');
      return;
    }
    
    console.log('🔍 [ACHIEVEMENT] checkAchievements called');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:427',message:'checkAchievements called',data:{isScreenshotMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch((e)=>{console.error('Log error:',e);});
    // #endregion
    
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        console.log('❌ [ACHIEVEMENT] No session token');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:432',message:'No session token',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch((e)=>{console.error('Log error:',e);});
        // #endregion
        return;
      }
      
      console.log('📡 [ACHIEVEMENT] Calling checkNewAchievementsAPI');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:436',message:'Calling checkNewAchievementsAPI',data:{hasToken:!!session.access_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch((e)=>{console.error('Log error:',e);});
      // #endregion
      
      const response = await checkNewAchievementsAPI(session.access_token);
      
      console.log('📥 [ACHIEVEMENT] API response:', { success: response.success, count: response.data?.new_achievements?.length || 0 });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:440',message:'checkNewAchievementsAPI response',data:{success:response.success,achievementsCount:response.data?.new_achievements?.length || 0,message:response.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch((e)=>{console.error('Log error:',e);});
      // #endregion
      
      if (response.success && response.data.new_achievements.length > 0) {
        console.log('🏆 [ACHIEVEMENT] New achievements unlocked:', response.data.new_achievements.length, response.data.new_achievements.map((a: any) => a.title));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:444',message:'Setting unlocked achievements',data:{count:response.data.new_achievements.length,achievements:response.data.new_achievements.map((a:any)=>({id:a.achievement_id,title:a.title}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch((e)=>{console.error('Log error:',e);});
        // #endregion
        setState(s => {
          const updated = {
            ...s,
            unlockedAchievements: [
              ...s.unlockedAchievements,
              ...response.data.new_achievements
            ]
          };
          console.log('💾 [ACHIEVEMENT] State updated:', { previous: s.unlockedAchievements.length, new: updated.unlockedAchievements.length });
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:469',message:'State updated with achievements',data:{previousCount:s.unlockedAchievements.length,newCount:updated.unlockedAchievements.length,totalUnlocked:updated.unlockedAchievements.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch((e)=>{console.error('Log error:',e);});
          // #endregion
          return updated;
        });
      } else if (!response.success) {
        console.error('❌ [ACHIEVEMENT] checkNewAchievementsAPI failed:', response.message);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:454',message:'checkNewAchievementsAPI failed',data:{message:response.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch((e)=>{console.error('Log error:',e);});
        // #endregion
      } else {
        console.log('ℹ️ [ACHIEVEMENT] No new achievements');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:458',message:'No new achievements found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch((e)=>{console.error('Log error:',e);});
        // #endregion
      }
    } catch (error) {
      console.error('❌ [ACHIEVEMENT] Exception in checkAchievements:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:463',message:'Exception in checkAchievements',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch((e)=>{console.error('Log error:',e);});
      // #endregion
    }
  }, [isScreenshotMode]);

  const clearUnlockedAchievements = useCallback(() => {
    setState(s => ({ ...s, unlockedAchievements: [] }));
  }, []);

  /**
   * DREAM COMPLETION DETECTION
   * 
   * Check if a dream is complete (all areas approved and all actions completed)
   */
  const checkDreamCompletion = useCallback(async (dreamId: string): Promise<boolean> => {
    try {
      // Check if all areas are approved
      const { data: areas, error: areasError } = await supabaseClient
        .from('areas')
        .select('id, approved_at')
        .eq('dream_id', dreamId)
        .is('deleted_at', null);
        
      if (areasError) {
        console.error('Error checking areas for dream completion:', areasError);
        return false;
      }
      
      const allAreasApproved = areas?.every(area => area.approved_at) ?? false;
      if (!allAreasApproved) {
        return false;
      }
      
      // Check if all action occurrences are completed
      const { data: occurrences, error: occurrencesError } = await supabaseClient
        .from('action_occurrences')
        .select('id, completed_at')
        .eq('dream_id', dreamId);
        
      if (occurrencesError) {
        console.error('Error checking occurrences for dream completion:', occurrencesError);
        return false;
      }
      
      const allOccurrencesComplete = occurrences?.every(occ => occ.completed_at) ?? false;
      return allOccurrencesComplete;
    } catch (error) {
      console.error('Error checking dream completion:', error);
      return false;
    }
  }, []);

  /**
   * OPTIMISTIC WRITES
   * 
   * These functions provide immediate UI updates (optimistic updates) while
   * performing background API calls. If the API call fails, the data is refreshed
   * to correct any inconsistencies.
   */

  // Complete an action occurrence with optimistic update
  const completeOccurrence: Ctx['completeOccurrence'] = useCallback(async (occurrenceId: string) => {
    // Optimistic remove from Today + mark complete in any open dreamDetail
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      if (s.today) {
        next.today = { 
          ...s.today, 
          occurrences: s.today.occurrences.filter(o => o.id !== occurrenceId) 
        };
      }
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          const dd = next.dreamDetail[k]!;
          next.dreamDetail[k] = { 
            ...dd, 
            occurrences: dd.occurrences.map(o => 
              o.id === occurrenceId 
                ? { ...o, completed_at: new Date().toISOString() } 
                : o
            ) 
          };
        }
      }
      if (next.today) saveJSON(CACHE_KEYS.today, next.today);
      return next;
    });

    const { error } = await supabaseClient
      .from('action_occurrences')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', occurrenceId);
      
    if (error) {
      console.error('Error completing occurrence:', error);
      await refresh(true);
    } else {
      // Check if this completion makes the dream complete
      try {
        const { data: occurrenceData } = await supabaseClient
          .from('action_occurrences')
          .select(`
            dream_id,
            actions!inner(
              areas!inner(
                dreams!inner(id, title, completed_at)
              )
            )
          `)
          .eq('id', occurrenceId)
          .single();
          
        if (occurrenceData?.actions?.[0]?.areas?.[0]?.dreams?.[0]) {
          const dream = occurrenceData.actions[0].areas[0].dreams[0];
          const dreamId = dream.id;
          const isDreamComplete = await checkDreamCompletion(dreamId);
          
          if (isDreamComplete) {
            console.log(`🎉 Dream "${dream.title}" is now complete!`);
            
            // Mark dream as complete
            await supabaseClient
              .from('dreams')
              .update({ completed_at: new Date().toISOString() })
              .eq('id', dreamId);
          }
        }
      } catch (completionError) {
        console.error('Error checking dream completion:', completionError);
        // Don't fail the whole operation if completion check fails
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:614',message:'completeOccurrence success, calling checkAchievements',data:{occurrenceId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
      // #endregion
      
      refresh();
      
      // Check for achievements after completing an occurrence
      await checkAchievements();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DataContext.tsx:620',message:'checkAchievements completed after completeOccurrence',data:{unlockedCount:state.unlockedAchievements.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
      // #endregion
    }
  }, [refresh, checkDreamCompletion, checkAchievements]);

  // Unmark a completed action occurrence with optimistic update
  const unmarkOccurrence: Ctx['unmarkOccurrence'] = useCallback(async (occurrenceId: string) => {
    // Optimistic: restore to pending state in dreamDetail and potentially add back to Today
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          const dd = next.dreamDetail[k]!;
          next.dreamDetail[k] = { 
            ...dd, 
            occurrences: dd.occurrences.map(o => 
              o.id === occurrenceId 
                ? { ...o, completed_at: null } 
                : o
            ) 
          };
        }
      }
      return next;
    });

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    try {
      await unmarkOccurrenceAPI(occurrenceId, session.access_token);
      // Refresh to get updated occurrence data and potentially add back to Today if due today
      await refresh(true);
    } catch (error) {
      console.error('Error unmarking occurrence:', error);
      await refresh(true);
    }
  }, [refresh]);

  // Defer an action occurrence to tomorrow with optimistic update
  const deferOccurrence: Ctx['deferOccurrence'] = useCallback(async (occurrenceId: string, newDueDate?: string) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const currentDate = newDueDate ? new Date(newDueDate) : new Date();
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDateStr = tomorrow.toISOString().split('T')[0];

    // Optimistic: remove from Today and update dream detail
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      if (s.today) {
        next.today = { 
          ...s.today, 
          occurrences: s.today.occurrences.filter(o => o.id !== occurrenceId) 
        };
      }
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          const dd = next.dreamDetail[k]!;
          next.dreamDetail[k] = { 
            ...dd, 
            occurrences: dd.occurrences.map(o => 
              o.id === occurrenceId 
                ? { ...o, due_on: newDateStr } 
                : o
            ) 
          };
        }
      }
      if (next.today) saveJSON(CACHE_KEYS.today, next.today);
      return next;
    });

    try {
      await deferOccurrenceAPI(occurrenceId, newDateStr, session.access_token);
      refresh();
    } catch (error) {
      console.error('Error deferring occurrence:', error);
      await refresh(true);
      throw error;
    }
  }, [refresh]);

  // Delete a dream with optimistic removal from all caches
  const deleteDream: Ctx['deleteDream'] = useCallback(async (dreamId: string) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    await deleteDreamAPI(dreamId, session.access_token);

    // Optimistically remove from all caches
    setState(s => {
      const next: State = { 
        ...s, 
        dreamDetail: { ...s.dreamDetail },
        dreamsSummary: s.dreamsSummary ? {
          ...s.dreamsSummary,
          dreams: s.dreamsSummary.dreams.filter(d => d.id !== dreamId)
        } : undefined,
        dreamsWithStats: s.dreamsWithStats ? {
          ...s.dreamsWithStats,
          dreams: s.dreamsWithStats.dreams.filter(d => d.id !== dreamId)
        } : undefined
      };
      
      delete next.dreamDetail[dreamId];
      
      if (next.dreamsSummary) {
        saveJSON(CACHE_KEYS.dreams, next.dreamsSummary);
      }
      if (next.dreamsWithStats) {
        saveJSON(CACHE_KEYS.dreams, next.dreamsWithStats);
      }
      saveJSON(CACHE_KEYS.detail(dreamId), undefined);
      
      return next;
    });

    refresh();
  }, [refresh]);

  // Archive a dream with optimistic update
  const archiveDream: Ctx['archiveDream'] = useCallback(async (dreamId: string) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    await archiveDreamAPI(dreamId, session.access_token);

    // Optimistically update the dream in caches
    setState(s => {
      const next: State = { 
        ...s, 
        dreamDetail: { ...s.dreamDetail },
        dreamsSummary: s.dreamsSummary ? {
          ...s.dreamsSummary,
          dreams: s.dreamsSummary.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: new Date().toISOString() } : d
          )
        } : undefined,
        dreamsWithStats: s.dreamsWithStats ? {
          ...s.dreamsWithStats,
          dreams: s.dreamsWithStats.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: new Date().toISOString() } : d
          )
        } : undefined
      };
      
      if (next.dreamDetail[dreamId]) {
        next.dreamDetail[dreamId] = {
          ...next.dreamDetail[dreamId]!,
          dream: next.dreamDetail[dreamId]!.dream ? {
            ...next.dreamDetail[dreamId]!.dream!,
            archived_at: new Date().toISOString()
          } : null
        };
      }
      
      if (next.dreamsSummary) {
        saveJSON(CACHE_KEYS.dreams, next.dreamsSummary);
      }
      if (next.dreamsWithStats) {
        saveJSON(CACHE_KEYS.dreams, next.dreamsWithStats);
      }
      if (next.dreamDetail[dreamId]) {
        saveJSON(CACHE_KEYS.detail(dreamId), next.dreamDetail[dreamId]);
      }
      
      return next;
    });

    refresh();
  }, [refresh]);

  // Unarchive a dream with optimistic update
  const unarchiveDream: Ctx['unarchiveDream'] = useCallback(async (dreamId: string) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    await unarchiveDreamAPI(dreamId, session.access_token);

    // Optimistically update the dream in caches
    setState(s => {
      const next: State = { 
        ...s, 
        dreamDetail: { ...s.dreamDetail },
        dreamsSummary: s.dreamsSummary ? {
          ...s.dreamsSummary,
          dreams: s.dreamsSummary.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: undefined } : d
          )
        } : undefined,
        dreamsWithStats: s.dreamsWithStats ? {
          ...s.dreamsWithStats,
          dreams: s.dreamsWithStats.dreams.map(d => 
            d.id === dreamId ? { ...d, archived_at: undefined } : d
          )
        } : undefined
      };
      
      if (next.dreamDetail[dreamId]) {
        next.dreamDetail[dreamId] = {
          ...next.dreamDetail[dreamId]!,
          dream: next.dreamDetail[dreamId]!.dream ? {
            ...next.dreamDetail[dreamId]!.dream!,
            archived_at: undefined
          } : null
        };
      }
      
      if (next.dreamsSummary) {
        saveJSON(CACHE_KEYS.dreams, next.dreamsSummary);
      }
      if (next.dreamsWithStats) {
        saveJSON(CACHE_KEYS.dreams, next.dreamsWithStats);
      }
      if (next.dreamDetail[dreamId]) {
        saveJSON(CACHE_KEYS.detail(dreamId), next.dreamDetail[dreamId]);
      }
      
      return next;
    });

    refresh();
  }, [refresh]);

  // Update action properties with optimistic update
  const updateAction: Ctx['updateAction'] = useCallback(async (actionId: string, updates: { title?: string; est_minutes?: number; difficulty?: string; repeat_every_days?: number; slice_count_target?: number; acceptance_criteria?: string[] }) => {
    // Optimistically update action in all relevant caches
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          const dd = next.dreamDetail[k]!;
          next.dreamDetail[k] = { 
            ...dd, 
            actions: dd.actions.map(a => 
              a.id === actionId 
                ? { ...a, ...updates } as any
                : a
            ) 
          };
        }
      }
      
      if (next.today) {
        next.today = {
          ...next.today,
          occurrences: next.today.occurrences.map(occ => {
            if (occ.action_id === actionId) {
              return {
                ...occ,
                actions: {
                  ...(occ as any).actions,
                  ...updates
                }
              } as any;
            }
            return occ;
          })
        };
      }
      
      if (next.today) {
        saveJSON(CACHE_KEYS.today, next.today);
      }
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          saveJSON(CACHE_KEYS.detail(k), next.dreamDetail[k]);
        }
      }
      
      return next;
    });
  }, []);

  // Delete an action occurrence with optimistic removal
  const deleteActionOccurrence: Ctx['deleteActionOccurrence'] = useCallback(async (occurrenceId: string) => {
    // Optimistically remove from Today and any open dreamDetail
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      if (s.today) {
        next.today = { 
          ...s.today, 
          occurrences: s.today.occurrences.filter(o => o.id !== occurrenceId) 
        };
      }
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          const dd = next.dreamDetail[k]!;
          next.dreamDetail[k] = { 
            ...dd, 
            occurrences: dd.occurrences.filter(o => o.id !== occurrenceId) 
          };
        }
      }
      if (next.today) saveJSON(CACHE_KEYS.today, next.today);
      return next;
    });
  }, []);

  // Update an area with optimistic update
  const updateArea: Ctx['updateArea'] = useCallback(async (areaId: string, updates: { title?: string; icon?: string; position?: number }) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    await updateAreaAPI(areaId, updates, session.access_token);

    // Optimistically update area in dreamDetail cache
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          const dd = next.dreamDetail[k]!;
          next.dreamDetail[k] = { 
            ...dd, 
            areas: dd.areas.map(a => 
              a.id === areaId 
                ? { ...a, ...updates } as any
                : a
            ) 
          };
        }
      }
      
      if (next.dreamDetail) {
        for (const k of Object.keys(next.dreamDetail)) {
          saveJSON(CACHE_KEYS.detail(k), next.dreamDetail[k]);
        }
      }
      
      return next;
    });

    refresh();
  }, [refresh]);

  // Delete an area with optimistic removal
  const deleteArea: Ctx['deleteArea'] = useCallback(async (areaId: string, dreamId: string) => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    await deleteAreaAPI(areaId, session.access_token);

    // Optimistically remove area and associated actions from dreamDetail cache
    setState(s => {
      const next: State = { ...s, dreamDetail: { ...s.dreamDetail } };
      
      if (next.dreamDetail[dreamId]) {
        const dd = next.dreamDetail[dreamId]!;
        next.dreamDetail[dreamId] = { 
          ...dd, 
          areas: dd.areas.filter(a => a.id !== areaId),
          actions: dd.actions.filter(a => a.area_id !== areaId)
        };
      }
      
      if (next.dreamDetail[dreamId]) {
        saveJSON(CACHE_KEYS.detail(dreamId), next.dreamDetail[dreamId]);
      }
      
      return next;
    });

    refresh();
  }, [refresh]);

  /**
   * EFFECTS AND LIFECYCLE MANAGEMENT
   * 
   * These useEffect hooks handle app lifecycle events, authentication changes,
   * and automatic data synchronization.
   */

  // Hydrate on mount (only load cached data, don't fetch)
  useEffect(() => {
    (async () => {
      const [summary, dreamsWithStats, today, progress] = await Promise.all([
        loadJSON<DreamsSummaryPayload>(CACHE_KEYS.dreams),
        loadJSON<DreamsWithStatsPayload>(CACHE_KEYS.dreams),
        loadJSON<TodayPayload>(CACHE_KEYS.today),
        loadJSON<ProgressPayload>(CACHE_KEYS.progress),
      ]);
      
      setState(s => ({ 
        ...s, 
        dreamsSummary: summary, 
        dreamsWithStats: dreamsWithStats,
        today: today ?? s.today,
        progress: progress ?? s.progress,
      }));

      const timestamps = [
        summary?.fetchedAt,
        dreamsWithStats?.fetchedAt,
        today?.fetchedAt,
        progress?.fetchedAt,
      ].filter(Boolean) as number[];
      
      if (timestamps.length > 0) {
        lastFetchedAt.current = Math.max(...timestamps);
      }
    })();
  }, []);

  // Load snapshot when user becomes authenticated
  useEffect(() => {
    console.log('DataContext auth effect triggered:', { isAuthenticated, authLoading });
    
    if (isAuthenticated && !authLoading) {
      console.log('User authenticated, loading snapshot');
      loadSnapshot().then(() => {
        // After loading cached data, check if we need fresh data
        console.log('Snapshot loaded, checking if refresh is needed');
        // Add a small delay to ensure auth state is fully propagated
        setTimeout(() => {
          refresh();
        }, 100);
      });
    } else if (!isAuthenticated && !authLoading) {
      console.log('User not authenticated, clearing data');
      clearAllData();
    }
  }, [isAuthenticated, authLoading, loadSnapshot, clearAllData, refresh]);

  // Auto-refresh every 5 minutes when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    intervalRef.current = setInterval(() => {
      refresh();
    }, 5 * 60_000); // 5 minutes

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, refresh]);

  // Revalidate on app foreground (when app becomes active)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active' && isAuthenticated) {
        console.log('App became active, revalidating data');
        refresh();
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, refresh]);

  /**
   * CONTEXT VALUE AND PROVIDER
   * 
   * Create the context value and provide it to child components.
   */

  const value: Ctx = useMemo(() => {
    const effectiveState = isScreenshotMode ? getScreenshotMockState() : state;
    
    return {
      state: effectiveState,
      isScreenshotMode,
      toggleScreenshotMode: setIsScreenshotMode,
      loadSnapshot,
      refresh,
      getDreamsSummary,
      getDreamsWithStats,
      getToday,
      getProgress,
      getDreamDetail,
      completeOccurrence,
      unmarkOccurrence,
      deferOccurrence,
      deleteDream,
      archiveDream,
      unarchiveDream,
      updateAction,
      deleteActionOccurrence,
      updateArea,
      deleteArea,
      isStale,
      lastSyncedLabel,
      clearDreamsWithStatsCache,
      checkDreamCompletion,
      checkAchievements,
      clearUnlockedAchievements,
      onScreenFocus,
    };
  }, [state, isScreenshotMode, checkAchievements, clearUnlockedAchievements]); // Depend on isScreenshotMode

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

/**
 * CUSTOM HOOK
 * 
 * Hook for consuming the DataContext. Provides type safety and ensures
 * the context is used within the DataProvider.
 */
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};