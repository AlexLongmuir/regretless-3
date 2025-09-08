import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'

export default function ReviewStep() {
  const navigation = useNavigation<any>()
  const { title, start_date, end_date } = useCreateDream()

  const handleComplete = () => {
    // TODO: Save the dream and navigate back to main app
    navigation.navigate('Tabs')
  }

  return (
    <View style={{ flex: 1 }}>
      <CreateScreenHeader step="review" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 24,
          lineHeight: 24
        }}>
          Review your dream
        </Text>
        
        <Text style={{ 
          fontSize: 12, 
          color: '#666', 
          marginBottom: 32 
        }}>
          Review all the details before creating your dream
        </Text>

        {/* Review content */}
        <View style={{ 
          backgroundColor: 'white', 
          padding: 20, 
          borderRadius: 12,
          marginBottom: 32
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Dream Title:</Text>
          <Text style={{ color: '#666', marginBottom: 16 }}>{title || 'Not set'}</Text>
          
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Start Date:</Text>
          <Text style={{ color: '#666', marginBottom: 16 }}>{start_date || 'Not set'}</Text>
          
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>End Date:</Text>
          <Text style={{ color: '#666' }}>{end_date || 'Not set'}</Text>
        </View>
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32
      }}>
        <Button 
          title="Create Dream" 
          variant={"black" as any}
          onPress={handleComplete} 
        />
      </View>
    </View>
  )
}
