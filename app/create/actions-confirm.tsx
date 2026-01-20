import React, { useState } from 'react'
import { View, Text, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { Button } from '../../components/Button'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { activateDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

export default function ActionsConfirmStep() {
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<any>()
  const { reset, areas, actions, dreamId, title, baseline, obstacles, enjoyment, figurineUrl } = useCreateDream()
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
        // Navigate back from CreateFlow modal to return to main app
        const parentNavigation = navigation.getParent()
        if (parentNavigation && parentNavigation.canGoBack()) {
          parentNavigation.goBack()
        } else if (navigation.canGoBack()) {
          navigation.goBack()
        }
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
  const totalActions = actions.length

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        <CreateScreenHeader step="actions-confirm" onReset={reset} />
        
        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1,
            justifyContent: 'flex-start', 
            alignItems: 'center',
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.lg
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
            fontSize: 32, 
            fontWeight: 'bold', 
            color: isDark ? theme.colors.text.primary : theme.colors.text.inverse, 
            marginBottom: theme.spacing.sm,
            textAlign: 'center'
          }}>
            Plan Complete!
          </Text>

          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: isDark ? theme.colors.text.primary : theme.colors.text.inverse, 
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 24
          }}>
            Fantastic! We've created {totalAreas} focus areas and {totalActions} actions for your dream.
          </Text>


          <Text style={{ 
            fontSize: 16, 
            color: isDark ? theme.colors.text.primary : theme.colors.text.inverse, 
            textAlign: 'center',
            lineHeight: 22
          }}>
            You're now ready to start working towards your dream!
          </Text>
        </ScrollView>
        
        {/* Sticky bottom buttons */}
        <View style={{ 
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.lg,
          backgroundColor: 'transparent'
        }}>
          <Button 
            title="View Dream" 
            variant="inverse"
            loading={isActivating}
            onPress={handleViewDream}
            style={{ borderRadius: theme.radius.xl, width: '100%' }}
          />
        </View>
      </SafeAreaView>
    </View>
  )
}
