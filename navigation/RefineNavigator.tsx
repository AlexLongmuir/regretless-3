/**
 * RefineNavigator - Navigation for the refine dream flow
 * 
 * This navigator handles the multi-step refine dream process:
 * 1. Areas step - Review and refine focus areas
 * 2. Areas confirm step - Confirm areas
 * 3. Actions step - Review and refine actions for each area
 * 4. Actions confirm step - Schedule occurrences and complete
 * 
 * This keeps the refine flow navigation separate from the main app navigation
 * and allows for easy management of the step-by-step process.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import refine flow screens
import RefineAreasStep from '../app/refine/areas';
import RefineAreasConfirmStep from '../app/refine/areas-confirm';
import RefineActionsStep from '../app/refine/actions';
import RefineActionsConfirmStep from '../app/refine/actions-confirm';
import ActionOccurrencePage from '../app/ActionOccurrencePage';

// Create stack navigator for refine flow
const RefineStack = createNativeStackNavigator();

/**
 * RefineNavigator - Stack navigation for refine dream flow
 * 
 * This navigator manages the step-by-step process of refining a dream.
 * Each screen represents a step in the flow, and users can navigate
 * forward and backward through the steps.
 */
const RefineNavigator = () => (
  <RefineStack.Navigator 
    screenOptions={{ 
      headerShown: false,
      gestureEnabled: true,
      animation: 'slide_from_right'
    }}
  >
    <RefineStack.Screen name="Areas" component={RefineAreasStep} />
    <RefineStack.Screen name="AreasConfirm" component={RefineAreasConfirmStep} />
    <RefineStack.Screen name="Actions" component={RefineActionsStep} />
    <RefineStack.Screen name="ActionsConfirm" component={RefineActionsConfirmStep} />
    <RefineStack.Screen 
      name="ActionOccurrence" 
      component={ActionOccurrencePage}
      options={{ presentation: 'modal' }}
    />
  </RefineStack.Navigator>
);

export default RefineNavigator;
