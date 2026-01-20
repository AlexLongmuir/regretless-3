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
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateFlowBackground } from '../components/create/CreateFlowBackground';

// Import create flow screens
import TitleStep from '../app/create/index';
import CreateFigurineStep from '../app/create/create-figurine';
import PersonalizeBaselineStep from '../app/create/personalize-baseline';
import PersonalizeObstaclesStep from '../app/create/personalize-obstacles';
import PersonalizeEnjoymentStep from '../app/create/personalize-enjoyment';
import TimeCommitmentStep from '../app/create/time-commitment';
import GoalFeasibilityStep from '../app/create/goal-feasibility';
import TimelineFeasibilityStep from '../app/create/timeline-feasibility';
import DreamConfirmStep from '../app/create/dream-confirm';
import PlanPreviewStep from '../app/create/plan-preview';
import ActionsConfirmStep from '../app/create/actions-confirm';
import ActionOccurrencePage from '../app/ActionOccurrencePage';

// Create stack navigator for create flow
const CreateStack = createNativeStackNavigator();

/**
 * CreateNavigator - Stack navigation for create dream flow
 * 
 * This navigator manages the step-by-step process of creating a dream.
 * Each screen represents a step in the flow, and users can navigate
 * forward and backward through the steps.
 */
const CreateNavigator = () => (
  <CreateFlowBackground>
    <CreateStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' }
      }}
    >
    <CreateStack.Screen name="Title" component={TitleStep} />
    <CreateStack.Screen name="CreateFigurine" component={CreateFigurineStep} />
    <CreateStack.Screen name="PersonalizeBaseline" component={PersonalizeBaselineStep} />
    <CreateStack.Screen name="PersonalizeObstacles" component={PersonalizeObstaclesStep} />
    <CreateStack.Screen name="PersonalizeEnjoyment" component={PersonalizeEnjoymentStep} />
    <CreateStack.Screen name="GoalFeasibility" component={GoalFeasibilityStep} />
    <CreateStack.Screen name="TimeCommitment" component={TimeCommitmentStep} />
    <CreateStack.Screen name="TimelineFeasibility" component={TimelineFeasibilityStep} />
    <CreateStack.Screen name="DreamConfirm" component={DreamConfirmStep} />
    <CreateStack.Screen name="PlanPreview" component={PlanPreviewStep} />
    <CreateStack.Screen name="ActionsConfirm" component={ActionsConfirmStep} />
    <CreateStack.Screen 
      name="ActionOccurrence" 
      component={ActionOccurrencePage}
      options={{ presentation: 'modal' }}
    />
  </CreateStack.Navigator>
  </CreateFlowBackground>
);

export default CreateNavigator;
