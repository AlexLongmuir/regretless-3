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

// Import create flow screens
import TitleStep from '../app/create/index';
import CreateFigurineStep from '../app/create/create-figurine';
import PersonalizeStep from '../app/create/personalize';
import TimeCommitmentStep from '../app/create/time-commitment';
import QuestionsStep from '../app/create/questions';
import GoalFeasibilityStep from '../app/create/goal-feasibility';
import TimelineFeasibilityStep from '../app/create/timeline-feasibility';
import DreamConfirmStep from '../app/create/dream-confirm';
import AreasStep from '../app/create/areas';
import AreasConfirmStep from '../app/create/areas-confirm';
import ActionsStep from '../app/create/actions';
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
  <CreateStack.Navigator 
    screenOptions={{ 
      headerShown: false,
      gestureEnabled: true,
      animation: 'slide_from_right'
    }}
  >
    <CreateStack.Screen name="Title" component={TitleStep} />
    <CreateStack.Screen name="CreateFigurine" component={CreateFigurineStep} />
    <CreateStack.Screen name="Questions" component={QuestionsStep} />
    <CreateStack.Screen name="Personalize" component={PersonalizeStep} />
    <CreateStack.Screen name="GoalFeasibility" component={GoalFeasibilityStep} />
    <CreateStack.Screen name="TimeCommitment" component={TimeCommitmentStep} />
    <CreateStack.Screen name="TimelineFeasibility" component={TimelineFeasibilityStep} />
    <CreateStack.Screen name="DreamConfirm" component={DreamConfirmStep} />
    <CreateStack.Screen name="Areas" component={AreasStep} />
    <CreateStack.Screen name="AreasConfirm" component={AreasConfirmStep} />
    <CreateStack.Screen name="Actions" component={ActionsStep} />
    <CreateStack.Screen name="ActionsConfirm" component={ActionsConfirmStep} />
    <CreateStack.Screen 
      name="ActionOccurrence" 
      component={ActionOccurrencePage}
      options={{ presentation: 'modal' }}
    />
  </CreateStack.Navigator>
);

export default CreateNavigator;
