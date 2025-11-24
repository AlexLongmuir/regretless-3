import { Platform } from 'react-native';

/**
 * Bottom Navigation Constants
 * 
 * These constants define the height and spacing for the bottom navigation bar
 * to ensure proper spacing on pages with sticky bottom elements.
 */

// Height of the bottom navigation bar itself (without safe area)
export const BOTTOM_NAV_HEIGHT = 66; // 50px tab height + 16px padding

// Safe area bottom padding (for devices with home indicator)
export const BOTTOM_SAFE_AREA = Platform.OS === 'ios' ? 20 : 8;

// Total height including safe area
export const BOTTOM_NAV_TOTAL_HEIGHT = BOTTOM_NAV_HEIGHT + BOTTOM_SAFE_AREA;

// Extra padding to add to pages with sticky bottom elements
export const BOTTOM_NAV_PADDING = BOTTOM_NAV_TOTAL_HEIGHT + 16; // +16px for visual breathing room
