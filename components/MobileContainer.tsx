import React, { ReactNode } from 'react';
import { View, StyleSheet, Dimensions, StatusBar, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface MobileContainerProps {
  children: ReactNode;
}

// iPhone 14/15 Pro Dimensions
const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;

// Debug flag - set to false to hide overlay
const SHOW_DEBUG_OVERLAY = false;

// Fake metrics to simulate iPhone 14/15 Pro safe areas (Dynamic Island + Home Indicator)
const IPHONE_METRICS = {
  insets: { top: 59, bottom: 34, left: 0, right: 0 },
  frame: { x: 0, y: 0, width: PHONE_WIDTH, height: PHONE_HEIGHT },
};

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  const { width, height, scale } = Dimensions.get('window');
  
  // Check if the device is wider than a large phone
  // We use 500 as a safe threshold to differentiate tablets/desktop from phones
  const isTabletOrDesktop = width > 500;

  const DebugOverlay = () => (
    <View style={styles.debugOverlay} pointerEvents="none">
      <Text style={styles.debugText}>Width: {width.toFixed(0)} | Height: {height.toFixed(0)}</Text>
      <Text style={styles.debugText}>Scale: {scale.toFixed(2)}</Text>
      <Text style={styles.debugText}>Tablet Mode: {isTabletOrDesktop ? 'YES' : 'NO'}</Text>
      <Text style={styles.debugText}>Container Active: {isTabletOrDesktop ? 'YES' : 'NO'}</Text>
    </View>
  );

  if (!isTabletOrDesktop) {
    return (
      <View style={styles.flex}>
        {SHOW_DEBUG_OVERLAY && <DebugOverlay />}
        {children}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {SHOW_DEBUG_OVERLAY && <DebugOverlay />}
      <View style={styles.contentContainer}>
        <SafeAreaProvider initialMetrics={IPHONE_METRICS}>
          {children}
        </SafeAreaProvider>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  debugOverlay: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    zIndex: 9999,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#111', // Dark background for the letterbox area
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: PHONE_WIDTH,
    height: '100%',
    maxHeight: PHONE_HEIGHT,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderRadius: 50, // Matches modern iPhone corner radius
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
