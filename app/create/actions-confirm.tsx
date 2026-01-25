import React, { useState } from 'react'
import { View, Text, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { Button } from '../../components/Button'
import { activateDream, generateDreamImage } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'

export default function ActionsConfirmStep() {
  const { theme } = useTheme()
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
      
      // Generate dream image if figurine URL is available
      if (result.success && figurineUrl) {
        try {
          const dreamContext = [
            baseline ? `Current baseline: ${baseline}` : '',
            obstacles ? `Obstacles: ${obstacles}` : '',
            enjoyment ? `Enjoyment: ${enjoyment}` : ''
          ].filter(Boolean).join('. ');
          
          await generateDreamImage(
            figurineUrl,
            title || 'My Dream',
            dreamContext,
            dreamId,
            session.access_token
          );
          console.log('✅ Dream image generated successfully');
        } catch (error) {
          console.error('❌ Failed to generate dream image:', error);
          // Don't fail the whole process if image generation fails
        }
      }
      
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background.page }}>
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
          Plan Complete!
        </Text>

        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: theme.colors.text.primary, 
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 24
        }}>
          Fantastic! We've created {totalAreas} focus areas and {totalActions} actions for your dream.
        </Text>


        <Text style={{ 
          fontSize: 16, 
          color: theme.colors.text.primary, 
          textAlign: 'center',
          lineHeight: 22
        }}>
          You're now ready to start working towards your dream!
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
          title="View Dream" 
          variant="black"
          loading={isActivating}
          onPress={handleViewDream}
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>
    </View>
  )
}
