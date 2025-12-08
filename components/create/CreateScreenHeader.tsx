import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { IconButton } from '../IconButton'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { theme } from '../../utils/theme'

export const CreateScreenHeader: React.FC<{ step?: string }> = ({ 
  step = 'title' 
}) => {
  const navigation = useNavigation()
  const { reset } = useCreateDream()
  
  const handleBack = () => {
    // If we're on the first step (Title), go back to main app
    // Otherwise, go back to previous step in create flow
    if (step === 'title') {
      navigation.goBack() // This will go back to main app
    } else {
      navigation.goBack() // This will go to previous step in create flow
    }
  }

  const handleClose = () => {
    // Reset the CreateDreamContext state
    reset()
    
    // Close the entire create flow and return to main app
    // Since CreateFlow is a modal, navigate back from the parent navigator
    const parentNavigation = navigation.getParent()
    if (parentNavigation && parentNavigation.canGoBack()) {
      // Navigate back from the CreateFlow modal to return to main app
      parentNavigation.goBack()
    } else {
      // Fallback: try to navigate back from current navigator
      // This handles cases where getParent() doesn't work as expected
      if (navigation.canGoBack()) {
        navigation.goBack()
      }
    }
  }

  return (
    <View style={styles.container}>
      <IconButton 
        icon="chevron_left_rounded" 
        onPress={handleBack}
        variant="ghost"
        size="lg"
        iconSize={42}
        iconWrapperStyle={{ marginLeft: -1 }}
      />
      <View style={styles.spacer} />
      <IconButton 
        icon="close" 
        onPress={handleClose}
        variant="ghost"
        size="lg"
        iconSize={42}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 30,
    marginTop: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent', // Ensure no background fill
  },
  spacer: {
    flex: 1
  }
})
