import React, { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

export default function QuestionsStep() {
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, baseline, obstacles, enjoyment, setField } = useCreateDream()

  const handleContinue = async () => {
    // Navigate immediately for smooth UX
    navigation.navigate('GoalFeasibility')

    // Handle backend operations in background
    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          await upsertDream({
            id: dreamId,
            title,
            start_date,
            end_date,
            image_url,
            baseline,
            obstacles,
            enjoyment
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save dream:', error)
      }
    }
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <CreateScreenHeader step="questions" />
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 32,
          lineHeight: 24
        }}>
          Tell us about your journey so far
        </Text>

        {/* Question 1 */}
        <Input
          value={baseline || ''}
          onChangeText={(text) => setField('baseline', text)}
          placeholder="Start writing..."
          label="What's your current progress"
          multiline
          variant="borderless"
          style={{ marginBottom: 32 }}
        />

        {/* Question 2 */}
        <Input
          value={obstacles || ''}
          onChangeText={(text) => setField('obstacles', text)}
          placeholder="Start writing..."
          label="What's most likely going to cause you not to achieve this?"
          multiline
          variant="borderless"
          style={{ marginBottom: 32 }}
        />

        {/* Question 3 */}
        <Input
          value={enjoyment || ''}
          onChangeText={(text) => setField('enjoyment', text)}
          placeholder="Start writing..."
          label="What's most likely to cause you to enjoy the journey?"
          multiline
          variant="borderless"
          style={{ marginBottom: 32 }}
        />
      </ScrollView>
      
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
          title="Continue"
          variant={"black" as any}
          onPress={handleContinue}
        />
      </View>
    </KeyboardAvoidingView>
  )
}
