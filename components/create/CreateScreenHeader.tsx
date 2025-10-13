import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { IconButton } from '../IconButton'
import { useCreateDream } from '../../contexts/CreateDreamContext'

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
    <View style={styles.wrap}>
      <IconButton 
        icon="chevron_left" 
        onPress={handleBack}
        variant="ghost"
        size="md"
        style={styles.whiteButton}
      />
      <View style={styles.spacer} />
      <IconButton 
        icon="close" 
        onPress={handleClose}
        variant="ghost"
        size="md"
        style={styles.whiteButton}
      />
    </View>
  )
}
const styles = StyleSheet.create({
  wrap: { 
    height: 52, 
    paddingHorizontal: 12, 
    paddingTop: 15,
    marginTop: 44, // Add space for status bar
    flexDirection:'row', 
    alignItems:'center', 
    justifyContent: 'space-between'
  },
  spacer: {
    flex: 1
  },
  whiteButton: {
    backgroundColor: 'white',
    borderRadius: 12
  }
})


