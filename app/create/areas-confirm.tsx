import React from 'react'
import { View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { useTheme } from '../../contexts/ThemeContext'

export default function AreasConfirmStep() {
  const { theme } = useTheme()
  const navigation = useNavigation<any>()

  const handleCreateGoal = () => {
    navigation.navigate('Actions')
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
          Areas Created!
        </Text>

        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: theme.colors.text.primary, 
          textAlign: 'center',
          lineHeight: 22
        }}>
          Finally, let's define exactly what you need to do in each area to achieve your dream.
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
          title="Create Goal" 
          variant="black"
          onPress={handleCreateGoal}
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>
    </View>
  )
}
