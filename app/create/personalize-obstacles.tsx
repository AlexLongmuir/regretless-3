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
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'

export default function PersonalizeObstaclesStep() {
  const { theme, isDark } = useTheme()
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark])
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, baseline, obstacles, enjoyment, setField } = useCreateDream()

  const handleContinue = async () => {
    Keyboard.dismiss()
    
    // Navigate immediately for smooth UX
    navigation.navigate('PersonalizeEnjoyment')

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
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CreateScreenHeader step="personalize-obstacles" />
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            What's most likely going to cause you not to achieve this?
          </Text>

          <Text style={styles.subtitle}>
            Answering this helps create a more customized plan that's more likely to succeed
          </Text>

          <Input
            value={obstacles || ''}
            onChangeText={(text) => setField('obstacles', text)}
            placeholder="Start writing or tap mic to speak..."
            multiline
            variant="borderless"
            style={styles.input}
            showMicButton={true}
          />
        </ScrollView>
      </SafeAreaView>
      
      {/* Footer with button */}
      <View style={styles.footer}>
        <Button 
          title="Continue"
          variant="inverse"
          onPress={handleContinue}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? theme.colors.text.primary : theme.colors.text.inverse,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: isDark ? theme.colors.text.secondary : theme.colors.text.inverse,
    opacity: isDark ? 1 : 0.85,
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  input: {
    marginBottom: 32,
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  button: {
    borderRadius: theme.radius.xl,
    width: '100%',
  },
})
