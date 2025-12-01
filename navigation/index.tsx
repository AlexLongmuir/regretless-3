/**
 * Navigation Root - Authentication-Aware Navigation Container
 * 
 * This is the main navigation file that handles routing based on authentication state.
 * It demonstrates a key React Native pattern: conditional navigation based on app state.
 * 
 * Navigation Structure:
 * 1. If auth is loading → Show loading screen
 * 2. If user is not authenticated → Show auth screens (login, signup)
 * 3. If user is authenticated → Show main app screens (home, dreams, profile)
 * 
 * Why this pattern:
 * - Clean separation between authenticated and unauthenticated flows
 * - Prevents flashing wrong screens during auth state changes
 * - Centralized place to handle deep links and auth redirects
 * - Follows React Navigation best practices
 * 
 * Key Concepts for Junior Developers:
 * - NavigationContainer: Root component that manages navigation state
 * - Conditional rendering: Different navigation stacks based on auth state
 * - Deep linking: Handling URLs that open specific screens in the app
 * - Stack Navigator: Manages screen transitions with a stack-like behavior
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Linking, ScrollView, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Import pages
import AccountPage from '../app/AccountPage';
import DreamsPage from '../app/DreamsPage';
import TodayPage from '../app/TodayPage';
import UtilitiesPage from '../app/UtilitiesPage';
import LoginPage from '../app/LoginPage';
import AuthLoadingPage from '../app/AuthLoadingPage';
import ActionPage from '../app/ActionPage';
import ActionOccurrencePage from '../app/ActionOccurrencePage';
import ArtifactSubmittedPage from '../app/ArtifactSubmittedPage';
import DreamCompletedPage from '../app/DreamCompletedPage';
import DreamPage from '../app/DreamPage';
import AreaPage from '../app/AreaPage';
import ProgressPage from '../app/ProgressPage';
import ContactUsPage from '../app/ContactUsPage';
import TermsOfServicePage from '../app/TermsOfServicePage';
import PrivacyPolicyPage from '../app/PrivacyPolicyPage';
import CreateNavigator from './CreateNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import PostPurchaseSignInStep from '../app/onboarding/post-purchase-signin';
import ScreenshotMenuPage from '../app/ScreenshotMenuPage';

// Wrapper component to provide OnboardingContext to the navigator
const OnboardingNavigatorWithProvider = () => (
  <OnboardingProvider>
    <OnboardingNavigator />
  </OnboardingProvider>
);

// Import components and hooks
import { StickyActionSuggestions } from '../components/StickyActionSuggestions';
import { useAuthContext } from '../contexts/AuthContext';
import { useEntitlementsContext } from '../contexts/EntitlementsContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import { theme } from '../utils/theme';

// Create stack navigators
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const BottomTab = createNativeBottomTabNavigator();

/**
 * AuthNavigator - Navigation for unauthenticated users
 * 
 * This navigator handles screens that users see when not logged in.
 * Includes onboarding flow and login screens.
 */
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Onboarding" component={OnboardingNavigatorWithProvider} />
    <AuthStack.Screen name="Login" component={LoginPage} />
  </AuthStack.Navigator>
);

// Refs for scroll-to-top functionality - shared across tab screens
const scrollRefs = {
  Dreams: React.createRef<ScrollView>(),
  Today: React.createRef<ScrollView>(),
  Progress: React.createRef<ScrollView>(),
  Account: React.createRef<ScrollView>(),
};

// Scroll to top function - exposed via ref
let scrollToTopFunction: (() => void) | null = null;

/**
 * TabNavigator - Native bottom tab navigation for authenticated users
 * 
 * Uses React Navigation's native bottom tabs with iOS liquid glass effect.
 * This provides the authentic native iOS tab bar appearance and behavior.
 */
const TabNavigator = ({ navigation, route }: any) => {
  const [showActionSuggestions, setShowActionSuggestions] = useState(false);

  // Listen for navigation events to show action suggestions
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route?.params?.showActionSuggestions) {
        setShowActionSuggestions(true);
        navigation.setParams({ showActionSuggestions: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route?.params?.showActionSuggestions]);

  /**
   * Handle action suggestion approval
   */
  const handleActionApprove = () => {
    setShowActionSuggestions(false);
  };

  /**
   * Handle action suggestion improvement
   */
  const handleActionImprove = () => {
    setShowActionSuggestions(false);
    navigation.navigate('CreateFlow', { phase: 'feedback' });
  };

  return (
    <View style={styles.container}>
      <BottomTab.Navigator
        screenOptions={{
          headerShown: false,
          // Native tabs automatically use liquid glass on iOS 26+
          // No need for custom tabBarBackground or tabBarStyle
        }}
      >
        <BottomTab.Screen
          name="Dreams"
          options={{
            title: 'Dreams',
            // Use SF Symbols on iOS for native look with liquid glass
            tabBarIcon: Platform.select({
              ios: () => ({ sfSymbol: 'star.fill' }), // SF Symbol for dreams/aspirations
              android: () => MaterialIcons.getImageSourceSync('star', 24),
            }),
          }}
          listeners={{
            tabPress: () => {
              // Scroll to top when tab is pressed (only works if already on this tab)
              scrollRefs.Dreams.current?.scrollTo({ y: 0, animated: true });
            },
          }}
        >
          {(props) => <DreamsPage {...props} scrollRef={scrollRefs.Dreams} />}
        </BottomTab.Screen>
        <BottomTab.Screen
          name="Today"
          options={{
            title: 'Today',
            tabBarIcon: Platform.select({
              ios: () => ({ sfSymbol: 'calendar' }),
              android: () => MaterialIcons.getImageSourceSync('calendar-today', 24),
            }),
          }}
          listeners={{
            tabPress: () => {
              scrollRefs.Today.current?.scrollTo({ y: 0, animated: true });
            },
          }}
        >
          {(props) => <TodayPage {...props} scrollRef={scrollRefs.Today} />}
        </BottomTab.Screen>
        <BottomTab.Screen
          name="Progress"
          options={{
            title: 'Progress',
            tabBarIcon: Platform.select({
              ios: () => ({ sfSymbol: 'chart.line.uptrend.xyaxis' }),
              android: () => MaterialIcons.getImageSourceSync('trending-up', 24),
            }),
          }}
          listeners={{
            tabPress: () => {
              scrollRefs.Progress.current?.scrollTo({ y: 0, animated: true });
            },
          }}
        >
          {(props) => <ProgressPage {...props} scrollRef={scrollRefs.Progress} />}
        </BottomTab.Screen>
        <BottomTab.Screen
          name="Account"
          options={{
            title: 'Account',
            tabBarIcon: Platform.select({
              ios: () => ({ sfSymbol: 'person' }),
              android: () => MaterialIcons.getImageSourceSync('person', 24),
            }),
          }}
          listeners={{
            tabPress: () => {
              scrollRefs.Account.current?.scrollTo({ y: 0, animated: true });
            },
          }}
        >
          {(props) => <AccountPage {...props} scrollRef={scrollRefs.Account} />}
        </BottomTab.Screen>
      </BottomTab.Navigator>
      
      {/* Sticky action suggestions overlay */}
      <StickyActionSuggestions
        visible={showActionSuggestions}
        onApprove={handleActionApprove}
        onImprove={handleActionImprove}
      />
    </View>
  );
};

// ScreenWrapper removed - was just a pass-through component

/**
 * MainNavigator - Stack navigation for authenticated users
 * 
 * This navigator handles the main app navigation with stack-based routing.
 * It includes the main tab-based interface and modal/detail screens.
 * The tab bar is automatically hidden when navigating to CreateFlow or other modal screens.
 */
const MainNavigator = ({ 
  onRouteChange
}: { 
  onRouteChange: (route: string) => void;
}) => {
  return (
    <View style={styles.container}>
      <MainStack.Navigator 
        screenOptions={{ headerShown: false }}
        screenListeners={{
          state: (e) => {
            // Notify parent of route changes
            const state = e.data.state;
            if (state) {
              const routeName = state.routes[state.index]?.name;
              if (routeName) {
                onRouteChange(routeName);
              }
            }
          },
        }}
      >
        <MainStack.Screen 
          name="Tabs" 
          component={TabNavigator}
        />
        <MainStack.Screen 
          name="Action" 
          component={ActionPage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="ActionOccurrence" 
          component={ActionOccurrencePage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="ArtifactSubmitted" 
          component={ArtifactSubmittedPage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="DreamCompleted" 
          component={DreamCompletedPage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="Dream" 
          component={DreamPage}
          options={{ presentation: 'card' }}
        />
        <MainStack.Screen 
          name="Area" 
          component={AreaPage}
          options={{ presentation: 'card' }}
        />
        <MainStack.Screen 
          name="Progress" 
          component={ProgressPage}
          options={{ presentation: 'card' }}
        />
        <MainStack.Screen 
          name="ContactUs" 
          component={ContactUsPage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="TermsOfService" 
          component={TermsOfServicePage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="PrivacyPolicy" 
          component={PrivacyPolicyPage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="ScreenshotMenu" 
          component={ScreenshotMenuPage}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen 
          name="CreateFlow" 
          component={CreateNavigator}
          options={{ presentation: 'fullScreenModal' }}
        />
      </MainStack.Navigator>
    </View>
  );
};

/**
 * AppNavigator - Main app navigation logic
 * 
 * This component decides which navigation stack to show based on auth state.
 * It's the core of our authentication-aware navigation.
 * 
 * Navigation Flow:
 * 1. App loads → AuthContext checks for existing session → loading = true
 * 2. Session check completes → loading = false, isAuthenticated is determined
 * 3. Based on isAuthenticated, show either AuthNavigator or MainNavigator
 * 
 * This pattern ensures users never see the wrong screens during auth transitions.
 */
const AppNavigator = () => {
  // Get authentication state from context
  const { isAuthenticated, isInitializing, handleAuthRedirect } = useAuthContext();
  const { hasProAccess, loading: entitlementsLoading } = useEntitlementsContext();
  
  // Track current route to hide tab bar when needed
  const [currentRoute, setCurrentRoute] = useState('Tabs');

  // Handle route changes from MainNavigator
  const handleRouteChange = useCallback((route: string) => {
    setCurrentRoute(route);
  }, []);

  // Set up scroll-to-top function
  useEffect(() => {
    scrollToTopFunction = () => {
      const activeTabName = 'Dreams'; // Could be tracked via navigation state if needed
      const activeRef = scrollRefs[activeTabName as keyof typeof scrollRefs];
      activeRef?.current?.scrollTo({ y: 0, animated: true });
    };
  }, []);

  /**
   * Handle deep linking for authentication
   * 
   * This effect sets up a listener for URLs that open the app.
   * Most importantly, it handles OAuth and magic link redirects.
   * 
   * How it works:
   * 1. Listen for URL events when app is already running
   * 2. Check if app was opened with a URL when it launches
   * 3. If URL matches auth callback pattern, process it
   * 
   * Example URLs this handles:
   * - dreamer://auth/callback?access_token=...  (magic link)
   * - dreamer://auth/callback#access_token=...  (OAuth)
   */
  useEffect(() => {
    /**
     * Handle URL when app is already running
     * This fires when user clicks a link while app is in background/foreground
     */
    const handleUrlEvent = async (event: { url: string }) => {
      console.log('Received URL while app running:', event.url);
      console.log('URL includes auth/callback:', event.url.includes('auth/callback'));
      
      // Check if this is an auth callback URL
      if (event.url.includes('auth/callback')) {
        console.log('Processing auth callback URL...');
        await handleAuthRedirect(event.url);
      }
    };

    /**
     * Handle URL when app is launched from closed state
     * This checks if the app was opened with a URL
     */
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      
      if (initialUrl) {
        console.log('App launched with URL:', initialUrl);
        
        // Check if this is an auth callback URL
        if (initialUrl.includes('auth/callback')) {
          await handleAuthRedirect(initialUrl);
        }
      }
    };

    // Set up the URL event listener
    const urlSubscription = Linking.addEventListener('url', handleUrlEvent);
    
    // Check for initial URL
    handleInitialUrl();

    // Cleanup listener when component unmounts
    return () => {
      urlSubscription.remove();
    };
  }, [handleAuthRedirect]);

  // Show loading screen while checking authentication status or entitlements
  if (isInitializing || entitlementsLoading) {
    return <AuthLoadingPage />;
  }

  // Show appropriate navigation stack based on authentication status and entitlements
  return (
    <View style={styles.container}>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // User is logged in - show main app with native tabs
          <MainStack.Screen name="Main">
            {(props) => <MainNavigator {...props} onRouteChange={handleRouteChange} />}
          </MainStack.Screen>
        ) : hasProAccess ? (
          // User has pro access but no auth - show PostPurchaseSignIn
          <MainStack.Screen name="PostPurchaseSignIn" component={PostPurchaseSignInStep} />
        ) : (
          // User is not logged in and no pro access - show authentication screens
          <MainStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </MainStack.Navigator>
    </View>
  );
};

/**
 * Styles for the navigation components
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**d
 * Root Navigation Component
 * 
 * This is the main export that gets used in App.tsx or layout.tsx.
 * It wraps everything in NavigationContainer, which is required for React Navigation.
 * 
 * NavigationContainer responsibilities:
 * - Manages navigation state
 * - Handles deep linking
 * - Provides navigation context to child components
 * - Handles hardware back button on Android
 * 
 * Why we export as default function:
 * - Simple, clean API for the root component
 * - NavigationContainer only needs to be rendered once in the app
 * - Keeps navigation setup encapsulated in this file
 */
export default () => (
  <NavigationContainer>
    <AppNavigator />
  </NavigationContainer>
);