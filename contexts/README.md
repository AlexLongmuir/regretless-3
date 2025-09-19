# DataContext System Documentation

This directory contains the simplified DataContext system that manages all application data with intelligent caching, optimistic updates, and automatic synchronization.

## File Overview

### 📁 `dataCache.ts` (120 lines)
**Purpose**: Handles all caching operations and utilities

**Key responsibilities**:
- Define TypeScript types for all cached data structures
- Provide cache keys and TTL (time-to-live) constants
- Implement cache operations (load, save, clear)
- Handle cache staleness checking and user-friendly labels

**Main exports**:
- Cache payload types (`DreamsSummaryPayload`, `TodayPayload`, etc.)
- Cache configuration (`CACHE_KEYS`, `CACHE_TTL`)
- Utility functions (`isStale`, `lastSyncedLabel`, `loadJSON`, `saveJSON`)
- Cache management (`clearCache`)

### 📁 `dataFetchers.ts` (481 lines)
**Purpose**: Contains all API calls and data fetching logic

**Key responsibilities**:
- Fetch dreams (basic and with computed stats)
- Fetch today's action occurrences for any date
- Fetch comprehensive progress data and photos
- Fetch detailed dream information
- Handle user authentication for all queries
- Process and transform raw database data

**Main exports**:
- `fetchDreamsSummary()` - Basic dreams list
- `fetchDreamsWithStats()` - Dreams with computed statistics
- `fetchToday()` - Action occurrences for specific dates
- `fetchProgress()` - Progress data, stats, and photos
- `fetchDreamDetail()` - Complete dream details

### 📁 `DataContext.tsx` (719 lines)
**Purpose**: Main provider that orchestrates all data management

**Key responsibilities**:
- Provide centralized state management
- Handle intelligent caching with TTL-based invalidation
- Implement optimistic updates for immediate UI feedback
- Manage automatic background refresh and data synchronization
- Handle screen focus-based data refresh
- Integrate with user authentication
- Provide error handling and fallback mechanisms

**Main exports**:
- `DataProvider` - React context provider component
- `useData()` - Custom hook for consuming the context

## Key Features

### 🚀 **Intelligent Caching**
- TTL-based cache invalidation (1 min for today data, 5 min for most data)
- Automatic cache persistence across app sessions
- Smart cache clearing on logout

### ⚡ **Optimistic Updates**
- Immediate UI updates for user actions
- Background API calls with automatic rollback on failure
- Seamless user experience with instant feedback

### 🔄 **Automatic Synchronization**
- Auto-refresh every 5 minutes when authenticated
- Refresh on app foreground (when app becomes active)
- Screen focus-based refresh for stale data
- Manual refresh capability with force option

### 🎯 **High Performance**
- Parallel data fetching for optimal speed
- Efficient state updates with minimal re-renders
- Smart cache checking to avoid unnecessary API calls

## Usage Example

```typescript
import { useData } from '../contexts/DataContext';

function MyComponent() {
  const { 
    state, 
    getDreamsSummary, 
    completeOccurrence, 
    onScreenFocus 
  } = useData();
  
  // Get dreams data
  const dreams = state.dreamsSummary?.dreams || [];
  
  // Trigger screen focus refresh
  onScreenFocus('dreams');
  
  // Complete an action with optimistic update
  const handleComplete = async (occurrenceId: string) => {
    await completeOccurrence(occurrenceId);
  };
  
  return (
    // Your component JSX
  );
}
```

## Architecture Benefits

### ✅ **Simplified Complexity**
- Reduced from 1 massive file (1,437 lines) to 3 focused files (1,319 total lines)
- Clear separation of concerns
- Easier to understand and maintain
- Better for Cursor AI token management

### ✅ **Maintained High UX**
- All original functionality preserved
- Fast loading with intelligent caching
- Immediate UI updates with optimistic updates
- Automatic data synchronization

### ✅ **Better Developer Experience**
- Clear file organization and purpose
- Comprehensive documentation and comments
- Type safety throughout
- Easy to extend and modify

## Migration Notes

The simplified DataContext maintains 100% API compatibility with the original implementation. All existing pages (`DreamsPage`, `TodayPage`, `ProgressPage`, `ActionOccurrencePage`, `DreamPage`) continue to work exactly as before without any changes required.
