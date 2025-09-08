import React from 'react'
import { View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'

export default function ActionsConfirmStep() {
  const navigation = useNavigation<any>()

  const handleViewDream = () => {
    // Navigate to main app or dream view
    navigation.navigate('Review')
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <CreateScreenHeader step="actions-confirm" />
      
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
          Actions Completed!
        </Text>

        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          textAlign: 'center',
          lineHeight: 22
        }}>
          Fantastic! You're now ready to start working towards your dream!
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
        backgroundColor: '#F3F4F6'
      }}>
        <Button 
          title="Next" 
          variant="black"
          onPress={handleViewDream} 
        />
      </View>
    </View>
  )
}
