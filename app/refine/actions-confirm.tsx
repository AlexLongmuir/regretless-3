import React, { useState } from 'react'
import { View, Text, Alert, ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { rescheduleActions } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { useData } from '../../contexts/DataContext'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'
import { trackEvent } from '../../lib/mixpanel'

export default function RefineActionsConfirmStep() {
  const { theme } = useTheme()
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { dreamId } = route.params as { dreamId: string }
  const { state, getDreamDetail } = useData()
  const [isScheduling, setIsScheduling] = useState(false)

  // Get dream data
  const dreamDetail = dreamId ? state.dreamDetail[dreamId] : undefined
  const areas = dreamDetail?.areas || []
  const actions = dreamDetail?.actions || []

  const handleComplete = async () => {
    if (!dreamId) {
      Alert.alert('Error', 'No dream ID found')
      return
    }

    setIsScheduling(true)
    
    try {
      // Get auth token
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // Reschedule all actions (including completed ones) to regenerate occurrences
      const result = await rescheduleActions(
        dreamId, 
        session.access_token, 
        { resetCompleted: true }
      )
      
      if (result.success) {
        trackEvent('refine_dream_completed', { 
          dream_id: dreamId,
          areas_count: areas.length,
          actions_count: actions.length,
          scheduled_count: result.scheduled_count
        })

        // Refresh dream detail to show updated occurrences
        await getDreamDetail(dreamId, { force: true })

        // Navigate back to dream page
        const parentNavigation = navigation.getParent()
        if (parentNavigation && parentNavigation.canGoBack()) {
          parentNavigation.goBack()
        } else if (navigation.canGoBack()) {
          navigation.goBack()
        }
      } else {
        Alert.alert(
          'Scheduling Failed', 
          'There was an error scheduling your actions. Please try again.'
        )
      }
    } catch (error) {
      console.error('Failed to schedule actions:', error)
      Alert.alert(
        'Scheduling Failed', 
        'There was an error scheduling your actions. Please try again.'
      )
    } finally {
      setIsScheduling(false)
    }
  }

  // Calculate completion stats
  const totalAreas = areas.length
  const totalActions = actions.length

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.page }}>
      <CreateScreenHeader step="actions-confirm" />
      
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1,
          justifyContent: 'flex-start', 
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingTop: 16
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: theme.colors.status.completed,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24
        }}>
          <Text style={{ 
            fontSize: 100, 
            color: theme.colors.text.inverse,
            fontWeight: 'bold'
          }}>
            ✓
          </Text>
        </View>

        {/* Title */}
        <Text style={{ 
          fontSize: 24, 
          fontWeight: 'bold', 
          color: theme.colors.text.primary, 
          marginBottom: 16,
          textAlign: 'center'
        }}>
          All Actions Reviewed!
        </Text>

        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: theme.colors.text.primary, 
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24
        }}>
          Fantastic! You've reviewed actions for all {totalAreas} areas with {totalActions} total actions.
        </Text>

        <Text style={{ 
          fontSize: 16, 
          color: theme.colors.text.primary, 
          textAlign: 'center',
          lineHeight: 22
        }}>
          Your action schedule will be updated and you're ready to continue working towards your dream!
        </Text>
      </ScrollView>
      
      {/* Sticky bottom buttons */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: BOTTOM_NAV_PADDING,
        backgroundColor: theme.colors.background.page
      }}>
        <Button 
          title="Complete" 
          variant="black"
          loading={isScheduling}
          onPress={handleComplete}
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>
    </View>
  )
}
