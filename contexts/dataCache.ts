/**
 * contexts/dataCache.ts
 * 
 * This file handles all caching operations for the DataContext system.
 * It provides utilities for storing and retrieving data from AsyncStorage,
 * managing cache TTL (time-to-live), and defining cache payload types.
 * 
 * Key responsibilities:
 * - Define TypeScript types for all cached data structures
 * - Provide cache keys and TTL constants
 * - Implement cache operations (load, save, clear)
 * - Handle cache staleness checking and labeling
 * 
 * This separation keeps caching logic isolated and reusable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * CACHE PAYLOAD TYPES
 * 
 * These types define the structure of data that gets cached in AsyncStorage.
 * Each payload includes a `fetchedAt` timestamp for TTL (time-to-live) management.
 */

// Basic dreams list without additional stats
export type DreamsSummaryPayload = { dreams: Dream[]; fetchedAt: number };

// Dreams list with computed statistics (streaks, counts, etc.)
export type DreamsWithStatsPayload = { dreams: DreamWithStats[]; fetchedAt: number };

// Today's action occurrences for a specific date
export type TodayPayload = { occurrences: ActionOccurrenceStatus[]; fetchedAt: number };

// Complete dream details including areas, actions, and occurrences
export type DreamDetailPayload = { 
  dream: Dream | null; 
  areas: Area[]; 
  actions: Action[]; 
  occurrences: ActionOccurrence[]; 
  fetchedAt: number 
};

// Comprehensive progress data including weekly stats, history, and photos
export type ProgressPayload = {
  weeklyProgress: {
    monday: 'active' | 'current' | 'missed' | 'future';
    tuesday: 'active' | 'current' | 'missed' | 'future';
    wednesday: 'active' | 'current' | 'missed' | 'future';
    thursday: 'active' | 'current' | 'missed' | 'future';
    friday: 'active' | 'current' | 'missed' | 'future';
    saturday: 'active' | 'current' | 'missed' | 'future';
    sunday: 'active' | 'current' | 'missed' | 'future';
  };
  thisWeekStats: {
    actionsPlanned: number;
    actionsDone: number;
    actionsOverdue: number;
  };
  historyStats: {
    week: { actionsComplete: number; activeDays: number; actionsOverdue: number; };
    month: { actionsComplete: number; activeDays: number; actionsOverdue: number; };
    year: { actionsComplete: number; activeDays: number; actionsOverdue: number; };
    allTime: { actionsComplete: number; activeDays: number; actionsOverdue: number; };
  };
  overallStreak: number;
  progressPhotos: Array<{
    id: string;
    uri: string;
    timestamp?: Date;
    dream_id: string;
  }>;
  fetchedAt: number;
};

// Import types from backend
import type { 
  Dream, 
  Area, 
  Action, 
  ActionOccurrence, 
  ActionOccurrenceStatus,
  DreamWithStats
} from '../backend/database/types';

/**
 * CACHE CONFIGURATION
 * 
 * Defines cache keys and TTL (time-to-live) constants for different data types.
 * This centralizes cache management and makes it easy to adjust caching behavior.
 */

// Cache keys used in AsyncStorage
export const CACHE_KEYS = {
  dreams: 'cache:dreams',                    // Basic dreams and dreams with stats
  today: 'cache:today',                      // Today's action occurrences
  progress: 'cache:progress',                // Progress data and photos
  detail: (id: string) => `cache:dreamDetail:${id}`, // Individual dream details
};

// TTL constants for different data freshness requirements
export const CACHE_TTL = {
  SHORT: 60_000,      // 1 minute - for frequently changing data (today's actions)
  MEDIUM: 5 * 60_000, // 5 minutes - for moderately changing data (dreams, progress)
  LONG: 30 * 60_000,  // 30 minutes - for rarely changing data (static content)
};

/**
 * UTILITY FUNCTIONS
 * 
 * Helper functions for cache management, staleness checking, and user-friendly labels.
 */

// Get current timestamp
export const now = () => Date.now();

// Check if cached data is stale based on TTL
export const isStale = (fetchedAt?: number, ttlMs = CACHE_TTL.MEDIUM) => {
  return !fetchedAt || (now() - fetchedAt) > ttlMs;
};

// Generate user-friendly sync status label
export const lastSyncedLabel = (fetchedAt?: number) => {
  if (!fetchedAt) return 'Never synced';
  const d = new Date(fetchedAt);
  return `Last synced ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * CACHE OPERATIONS
 * 
 * Low-level functions for reading, writing, and clearing cache data.
 * These handle JSON serialization/deserialization and error handling.
 */

// Load and parse JSON data from AsyncStorage
export const loadJSON = async <T,>(key: string): Promise<T | undefined> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch { 
    return undefined; 
  }
};

// Save JSON data to AsyncStorage
export const saveJSON = async (key: string, value: unknown) => {
  try { 
    await AsyncStorage.setItem(key, JSON.stringify(value)); 
  } catch { 
    console.error(`Failed to save cache for ${key}`);
  }
};

// Clear all cached data (used on logout)
export const clearCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.dreams,
      CACHE_KEYS.today,
      CACHE_KEYS.progress,
    ]);
    
    // Clear dream detail caches (these have dynamic keys)
    const allKeys = await AsyncStorage.getAllKeys();
    const detailKeys = allKeys.filter(key => key.startsWith('cache:dreamDetail:'));
    if (detailKeys.length > 0) {
      await AsyncStorage.multiRemove(detailKeys);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};
