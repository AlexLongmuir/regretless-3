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
    // Navigate to the parent navigator's Tabs screen
    const parentNavigation = navigation.getParent()
    if (parentNavigation) {
      parentNavigation.navigate('Tabs')
    } else {
      // Fallback: just go back
      navigation.goBack()
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
