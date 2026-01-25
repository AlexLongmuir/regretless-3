/**
 * CreateNavigator - Navigation for the create dream flow
 * 
 * This navigator handles the multi-step create dream process:
 * 1. Title step - User enters their dream title
 * 2. Areas step - User selects focus areas
 * 3. Actions step - User defines specific actions
 * 4. Actions confirm step - User confirms their action plan
 * 
 * This keeps the create flow navigation separate from the main app navigation
 * and allows for easy management of the step-by-step process.
 */

import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { CreateFlowBackground } from '../components/create/CreateFlowBackground';
import { Icon } from '../components/Icon';
import { useCreateDream } from '../contexts/CreateDreamContext';

// Import create flow screens
import TitleStep from '../app/create/index';
// Note: Some screens (CreateFigurine, PersonalizeBaseline, PersonalizeObstacles, PersonalizeEnjoyment, PlanPreview) 
// don't exist yet or were removed - uncomment when they're available
import TimeCommitmentStep from '../app/create/time-commitment';
import GoalFeasibilityStep from '../app/create/goal-feasibility';
import TimelineFeasibilityStep from '../app/create/timeline-feasibility';
import DreamConfirmStep from '../app/create/dream-confirm';
import ActionsConfirmStep from '../app/create/actions-confirm';
import ActionOccurrencePage from '../app/ActionOccurrencePage';

// Create stack navigator for create flow
const CreateStack = createNativeStackNavigator();

/**
 * Render native iOS back button for header
 */
const renderBackButton = (navigation: any, tintColor: string) => {
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{
        marginLeft: Platform.OS === 'ios' ? -8 : 0,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Icon name="chevron_left_rounded" size={42} color={tintColor} />
    </TouchableOpacity>
  );
};

/**
 * Render native iOS close button for header
 */
const renderCloseButton = (navigation: any, tintColor: string, onReset?: () => void) => {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onReset) {
          onReset();
        }
        // Close the entire flow and return to main app
        const parentNavigation = navigation.getParent();
        if (parentNavigation && parentNavigation.canGoBack()) {
          parentNavigation.goBack();
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
      style={{
        marginRight: Platform.OS === 'ios' ? -8 : 0,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Icon name="close" size={38} color={tintColor} />
    </TouchableOpacity>
  );
};

/**
 * CreateNavigator - Stack navigation for create dream flow
 * 
 * This navigator manages the step-by-step process of creating a dream.
 * Each screen represents a step in the flow, and users can navigate
 * forward and backward through the steps.
 * 
 * Uses native iOS headers that stay static while content scrolls.
 */
const CreateNavigator = () => {
  const { theme, isDark } = useTheme();
  const { reset } = useCreateDream();
  
  const headerTintColor = isDark ? theme.colors.text.primary : theme.colors.text.inverse;

  return (
    <CreateFlowBackground>
      <CreateStack.Navigator 
        screenOptions={{ 
          headerShown: true,
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: headerTintColor,
          gestureEnabled: true,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent', paddingTop: 0 }
        }}
      >
        <CreateStack.Screen 
          name="Title" 
          component={TitleStep}
          options={({ navigation }) => ({
            headerLeft: () => null,
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        {/* Commented out screens that don't exist yet or were removed */}
        {/* <CreateStack.Screen 
          name="CreateFigurine" 
          component={CreateFigurineStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        <CreateStack.Screen 
          name="PersonalizeBaseline" 
          component={PersonalizeBaselineStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        <CreateStack.Screen 
          name="PersonalizeObstacles" 
          component={PersonalizeObstaclesStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        <CreateStack.Screen 
          name="PersonalizeEnjoyment" 
          component={PersonalizeEnjoymentStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        /> */}
        <CreateStack.Screen 
          name="GoalFeasibility" 
          component={GoalFeasibilityStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        <CreateStack.Screen 
          name="TimeCommitment" 
          component={TimeCommitmentStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        <CreateStack.Screen 
          name="TimelineFeasibility" 
          component={TimelineFeasibilityStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        <CreateStack.Screen 
          name="DreamConfirm" 
          component={DreamConfirmStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
        {/* <CreateStack.Screen 
          name="PlanPreview" 
          component={PlanPreviewStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        /> */}
        <CreateStack.Screen 
          name="ActionsConfirm" 
          component={ActionsConfirmStep}
          options={({ navigation }) => ({
            headerLeft: () => renderBackButton(navigation, headerTintColor),
            headerRight: () => renderCloseButton(navigation, headerTintColor, reset),
          })}
        />
        <CreateStack.Screen 
          name="ActionOccurrence" 
          component={ActionOccurrencePage}
          options={({ navigation }) => ({ 
            presentation: 'modal',
            headerLeft: () => null,
            headerRight: () => renderCloseButton(navigation, headerTintColor),
          })}
        />
      </CreateStack.Navigator>
    </CreateFlowBackground>
  );
};

export default CreateNavigator;
