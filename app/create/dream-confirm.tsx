import React from 'react'
import { View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { theme } from '../../utils/theme'

export default function ConfirmStep() {
  const navigation = useNavigation<any>()

  const handleNext = () => {
    navigation.navigate('Areas')
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
      <CreateScreenHeader step="confirm" />
      
      <View style={{ 
        flex: 1, 
        justifyContent: 'flex-start', 
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 80
      }}>
        {/* Success Icon */}
        <View style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: '#10B981', // Green color
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24
        }}>
          <Text style={{ 
            fontSize: 100, 
            color: 'white',
            fontWeight: 'bold'
          }}>
            ✓
          </Text>
        </View>

        {/* Title */}
        <Text style={{ 
          fontSize: 24, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 16,
          textAlign: 'center'
        }}>
          Dream Created!
        </Text>

        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          textAlign: 'center',
          lineHeight: 22
        }}>
          Next, let's work on the areas we want to cover within the dream.
        </Text>
      </View>
      
      {/* Sticky bottom button */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32,
        backgroundColor: theme.colors.pageBackground
      }}>
        <Button 
          title="Next" 
          variant="black"
          onPress={handleNext} 
        />
      </View>
    </View>
  )
}
