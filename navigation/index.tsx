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
import { View, StyleSheet, Linking, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

// Wrapper component to provide OnboardingContext to the navigator
const OnboardingNavigatorWithProvider = () => (
  <OnboardingProvider>
    <OnboardingNavigator />
  </OnboardingProvider>
);

// Import components and hooks
import { BottomNavigation } from '../components/BottomNavigation';
import { StickyActionSuggestions } from '../components/StickyActionSuggestions';
import { useAuthContext } from '../contexts/AuthContext';
import { useEntitlementsContext } from '../contexts/EntitlementsContext';
import { OnboardingProvider } from '../contexts/OnboardingContext';

// Create stack navigators
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

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

/**
 * TabNavigator - Tab-based navigation for authenticated users
 * 
 * This navigator handles the main tab-based experience for logged-in users.
 * It uses a custom tab navigation approach rather than React Navigation's
 * bottom tabs to match your existing design.
 * 
 * How it works:
 * 1. State tracks which tab is active
 * 2. Screen content changes based on active tab
 * 3. Bottom navigation is now handled by MainNavigator
 */
const TabNavigator = ({ navigation, route, activeTab: propActiveTab, scrollToTopRef }: any) => {
  const [activeTab, setActiveTab] = useState('Dreams');
  const [showActionSuggestions, setShowActionSuggestions] = useState(false);
  const prevPropActiveTab = useRef(propActiveTab);
  
  // Refs for scroll-to-top functionality
  const dreamsScrollRef = useRef<ScrollView | null>(null);
  const todayScrollRef = useRef<ScrollView | null>(null);
  const progressScrollRef = useRef<ScrollView | null>(null);
  const accountScrollRef = useRef<ScrollView | null>(null);

  // Update activeTab when prop changes (from bottom nav)
  useEffect(() => {
    if (propActiveTab && propActiveTab !== prevPropActiveTab.current) {
      setActiveTab(propActiveTab);
      prevPropActiveTab.current = propActiveTab;
    }
  }, [propActiveTab]);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    switch (activeTab) {
      case 'Dreams':
        dreamsScrollRef.current?.scrollTo({ y: 0, animated: true });
        break;
      case 'Today':
        todayScrollRef.current?.scrollTo({ y: 0, animated: true });
        break;
      case 'Progress':
        progressScrollRef.current?.scrollTo({ y: 0, animated: true });
        break;
      case 'Account':
        accountScrollRef.current?.scrollTo({ y: 0, animated: true });
        break;
    }
  }, [activeTab]);

  // Expose scroll-to-top function via ref
  useEffect(() => {
    if (scrollToTopRef) {
      scrollToTopRef.current = scrollToTop;
    }
  }, [scrollToTop, scrollToTopRef]);

  // Render screen based on active tab
  const renderScreen = () => {
    const commonProps = { navigation };
    
    switch (activeTab) {
      case 'Dreams':
        return <DreamsPage {...commonProps} scrollRef={dreamsScrollRef} />;
      case 'Today':
        return <TodayPage {...commonProps} scrollRef={todayScrollRef} />;
      case 'Progress':
        return <ProgressPage {...commonProps} scrollRef={progressScrollRef} />;
      case 'Account':
        return <AccountPage {...commonProps} scrollRef={accountScrollRef} />;
      default:
        return <DreamsPage {...commonProps} scrollRef={dreamsScrollRef} />;
    }
  };

  // Listen for navigation events to show action suggestions and handle tab changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route?.params?.showActionSuggestions) {
        setShowActionSuggestions(true);
        // Clear the param to prevent showing again
        navigation.setParams({ showActionSuggestions: undefined });
      }
      
      // Handle activeTab parameter
      if (route?.params?.activeTab) {
        setActiveTab(route.params.activeTab);
        // Clear the param to prevent showing again
        navigation.setParams({ activeTab: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route?.params?.showActionSuggestions, route?.params?.activeTab]);

  // No need to notify parent since parent controls the active tab directly

  /**
   * Handle action suggestion approval
   */
  const handleActionApprove = () => {
    setShowActionSuggestions(false);
    // Show success message or navigate to completion
    // For now, just hide the overlay - the goal creation is complete
  };

  /**
   * Handle action suggestion improvement
   */
  const handleActionImprove = () => {
    setShowActionSuggestions(false);
    // Navigate back to CreateFlow for feedback
    navigation.navigate('CreateFlow', { phase: 'feedback' });
  };

  return (
    <View style={styles.container}>
      {/* Main content area - renders the active tab's screen */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
      
      {/* Sticky action suggestions overlay - positioned on top of everything */}
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
 * Now includes bottom navigation for all screens except CreateFlow.
 */
const MainNavigator = ({ 
  activeTab, 
  onTabPress, 
  onRouteChange,
  scrollToTopRef
}: { 
  activeTab: string; 
  onTabPress: (tabKey: string) => void;
  onRouteChange: (route: string) => void;
  scrollToTopRef: React.MutableRefObject<(() => void) | null>;
}) => {

  return (
    <View style={styles.container}>
      {/* Main content area - this will animate during transitions */}
      <View style={styles.navigatorContainer}>
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
        <MainStack.Screen name="Tabs">
          {(props) => <TabNavigator {...props} activeTab={activeTab} scrollToTopRef={scrollToTopRef} />}
        </MainStack.Screen>
        <MainStack.Screen name="Action" component={ActionPage} />
        <MainStack.Screen name="ActionOccurrence" component={ActionOccurrencePage} />
        <MainStack.Screen name="ArtifactSubmitted" component={ArtifactSubmittedPage} />
        <MainStack.Screen name="DreamCompleted" component={DreamCompletedPage} />
        <MainStack.Screen name="Dream" component={DreamPage} />
        <MainStack.Screen name="Area" component={AreaPage} />
        <MainStack.Screen name="Progress" component={ProgressPage} />
        <MainStack.Screen name="ContactUs" component={ContactUsPage} />
        <MainStack.Screen name="TermsOfService" component={TermsOfServicePage} />
        <MainStack.Screen name="PrivacyPolicy" component={PrivacyPolicyPage} />
        <MainStack.Screen name="CreateFlow" component={CreateNavigator} />
      </MainStack.Navigator>
      </View>
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
  const { isAuthenticated, loading, handleAuthRedirect } = useAuthContext();
  const { hasProAccess, loading: entitlementsLoading } = useEntitlementsContext();
  
  // Bottom navigation state - moved to top level for instant rendering
  const [activeTab, setActiveTab] = useState('Dreams');
  const [currentRoute, setCurrentRoute] = useState('Tabs');
  
  // Ref to trigger scroll to top
  const scrollToTopRef = useRef<(() => void) | null>(null);

  // Handle tab press from bottom navigation
  const handleTabPress = useCallback((tabKey: string) => {
    if (tabKey === activeTab) {
      // If same tab is pressed, trigger scroll to top
      if (scrollToTopRef.current) {
        scrollToTopRef.current();
      }
      return;
    }
    setActiveTab(tabKey);
  }, [activeTab]);

  // Handle route changes from MainNavigator
  const handleRouteChange = useCallback((route: string) => {
    setCurrentRoute(route);
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
  if (loading || entitlementsLoading) {
    return <AuthLoadingPage />;
  }

  // Show appropriate navigation stack based on authentication status and entitlements
  return (
    <View style={styles.container}>
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        // User is logged in - show main app
                <MainStack.Screen name="Main">
                  {(props) => <MainNavigator {...props} activeTab={activeTab} onTabPress={handleTabPress} onRouteChange={handleRouteChange} scrollToTopRef={scrollToTopRef} />}
                </MainStack.Screen>
      ) : hasProAccess ? (
        // User has pro access but no auth - show PostPurchaseSignIn
        <MainStack.Screen name="PostPurchaseSignIn" component={PostPurchaseSignInStep} />
      ) : (
        // User is not logged in and no pro access - show authentication screens
        <MainStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </MainStack.Navigator>
      
      {/* Bottom navigation - always render but hide when in CreateFlow */}
      {isAuthenticated && (
        <View style={currentRoute === 'CreateFlow' ? styles.hidden : styles.visible}>
          <BottomNavigation
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        </View>
      )}
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
  navigatorContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  visible: {
    // Normal visibility
  },
  hidden: {
    position: 'absolute',
    top: -1000, // Move off-screen instead of hiding
    left: 0,
    right: 0,
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