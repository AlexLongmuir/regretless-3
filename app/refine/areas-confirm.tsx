import React from 'react'
import { View, Text } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { useTheme } from '../../contexts/ThemeContext'

export default function RefineAreasConfirmStep() {
  const { theme } = useTheme()
  const navigation = useNavigation<any>()
  const route = useRoute()

  const handleContinue = () => {
    const { dreamId } = (route.params as { dreamId?: string }) || {}
    navigation.navigate('Actions', { dreamId })
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.page }}>
      <CreateScreenHeader step="areas-confirm" />
      
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
          backgroundColor: theme.colors.status.completed,
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
          color: theme.colors.text.primary, 
          marginBottom: 16,
          textAlign: 'center'
        }}>
          Areas Updated!
        </Text>

        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: theme.colors.text.primary, 
          textAlign: 'center',
          lineHeight: 22
        }}>
          Now let's review the actions for each area.
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
        backgroundColor: theme.colors.background.page
      }}>
        <Button 
          title="Continue" 
          variant="black"
          onPress={handleContinue}
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>
    </View>
  )
}
