import React, { useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { activateDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'

export default function ActionsConfirmStep() {
  const navigation = useNavigation<any>()
  const { areas, actions, dreamId } = useCreateDream()
  const [isActivating, setIsActivating] = useState(false)

  const handleViewDream = async () => {
    if (!dreamId) {
      Alert.alert('Error', 'No dream ID found')
      return
    }

    setIsActivating(true)
    
    try {
      // Get auth token
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // Activate the dream and schedule actions
      const result = await activateDream({ dream_id: dreamId }, session.access_token)
      
      // Check if activation and scheduling were successful
      if (result.success) {
        // Navigate to main app tabs
        navigation.navigate('Tabs')
      } else {
        // Show error if activation or scheduling failed
        Alert.alert(
          'Activation Failed', 
          result.error || 'There was an error activating your dream. Please try again.'
        )
      }
    } catch (error) {
      console.error('Failed to activate dream:', error)
      Alert.alert(
        'Activation Failed', 
        'There was an error activating your dream. Please try again.'
      )
    } finally {
      setIsActivating(false)
    }
  }

  // Calculate completion stats
  const totalAreas = areas.length
  const completedAreas = areas.filter(area => area.approved_at).length
  const totalActions = actions.length

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
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
          All Actions Completed!
        </Text>

        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24
        }}>
          Fantastic! You've approved actions for all {completedAreas} areas and created {totalActions} total actions.
        </Text>


        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          textAlign: 'center',
          lineHeight: 22
        }}>
          You're now ready to start working towards your dream!
        </Text>
      </View>
      
      {/* Sticky bottom buttons */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: BOTTOM_NAV_PADDING,
        backgroundColor: theme.colors.pageBackground
      }}>
        <Button 
          title={isActivating ? "Activating Dream..." : "View Dream"} 
          variant="black"
          onPress={handleViewDream}
          disabled={isActivating}
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>
    </View>
  )
}
