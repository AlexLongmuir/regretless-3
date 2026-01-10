import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'

export default function QuestionsStep() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, baseline, obstacles, enjoyment, setField } = useCreateDream()

  // Check if all three inputs are filled
  const isFormValid = Boolean(
    baseline?.trim() && 
    obstacles?.trim() && 
    enjoyment?.trim()
  )

  const handleContinue = async () => {
    // Prevent navigation if form is not valid
    if (!isFormValid) {
      return
    }

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <CreateScreenHeader step="questions" />
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Tell us about your journey so far
        </Text>

        {/* Question 1 */}
        <Input
          value={baseline || ''}
          onChangeText={(text) => setField('baseline', text)}
          placeholder="Start writing or tap mic to speak..."
          label="What's your current progress"
          multiline
          variant="borderless"
          style={styles.input}
          showMicButton={true}
        />

        {/* Question 2 */}
        <Input
          value={obstacles || ''}
          onChangeText={(text) => setField('obstacles', text)}
          placeholder="Start writing or tap mic to speak..."
          label="What's most likely going to cause you not to achieve this?"
          multiline
          variant="borderless"
          style={styles.input}
          showMicButton={true}
        />

        {/* Question 3 */}
        <Input
          value={enjoyment || ''}
          onChangeText={(text) => setField('enjoyment', text)}
          placeholder="Start writing or tap mic to speak..."
          label="What's most likely to cause you to enjoy the journey?"
          multiline
          variant="borderless"
          style={styles.input}
          showMicButton={true}
        />
      </ScrollView>
      
      {/* Footer with button */}
      <View style={styles.footer}>
        <Button 
          title="Continue"
          variant={"black" as any}
          onPress={handleContinue}
          style={styles.button}
          disabled={!isFormValid}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: 400,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.text.primary,
    textAlign: 'left',
    marginBottom: theme.spacing['2xl'],
  },
  input: {
    marginBottom: 32,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background.page,
  },
  button: {
    borderRadius: theme.radius.xl,
    width: '100%',
  },
})
