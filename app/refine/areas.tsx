import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { AreaGrid } from '../../components/AreaChips'
import { generateAreas, upsertAreas } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { useData } from '../../contexts/DataContext'
import { trackEvent } from '../../lib/mixpanel'
import type { Area } from '../../backend/database/types'

interface AreaSuggestion {
  id: string
  title: string
  emoji: string
  imageUrl?: string
  selected?: boolean
}

export default function RefineAreasStep() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { dreamId } = (route.params as { dreamId?: string }) || {}
  const { state, getDreamDetail } = useData()
  
  if (!dreamId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: theme.colors.text.primary, marginBottom: 16 }}>No dream ID provided</Text>
        <Button 
          title="Go Back" 
          variant="secondary"
          onPress={() => navigation.goBack()} 
        />
      </View>
    )
  }
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [localAreas, setLocalAreas] = useState<Area[]>([])

  // Get dream data
  const dreamDetail = dreamId ? state.dreamDetail[dreamId] : undefined
  const dream = dreamDetail?.dream
  const existingAreas = dreamDetail?.areas || []

  // Load dream detail on mount
  useEffect(() => {
    if (dreamId) {
      getDreamDetail(dreamId, { force: true })
    }
  }, [dreamId, getDreamDetail])

  // Sync local areas with existing areas
  useEffect(() => {
    if (existingAreas.length > 0 && localAreas.length === 0) {
      setLocalAreas(existingAreas)
    }
  }, [existingAreas])

  // Convert areas to local UI format, sorted by position
  const areaSuggestions: AreaSuggestion[] = localAreas
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(area => ({
      id: area.id,
      title: area.title,
      emoji: area.icon || '🚀',
      imageUrl: area.image_url
    }))

  const handleSaveAreas = async () => {
    if (!dreamId) return
    
    setIsSaving(true)
    trackEvent('refine_dream_areas_approved', { final_count: localAreas.length })
    
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const areasToSend = localAreas.map((area, index) => ({
        ...area,
        position: area.position ?? index
      }))
      
      await upsertAreas({
        dream_id: dreamId,
        areas: areasToSend
      }, session.access_token)

      // Refresh dream detail
      await getDreamDetail(dreamId, { force: true })
      
      navigation.navigate('AreasConfirm', { dreamId })
    } catch (error) {
      console.error('Failed to save areas:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRefine = async () => {
    if (!dreamId || !dream || !feedback.trim()) return
    
    trackEvent('refine_dream_areas_refine', { feedback_length: feedback.length })

    Keyboard.dismiss()
    setIsLoading(true)
    
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const generatedAreas = await generateAreas({ 
        dream_id: dreamId,
        title: dream.title,
        start_date: dream.start_date || undefined,
        end_date: dream.end_date || undefined,
        baseline: dream.baseline || undefined,
        obstacles: dream.obstacles || undefined,
        enjoyment: dream.enjoyment || undefined,
        feedback: feedback.trim() || undefined,
        original_areas: localAreas.length > 0 ? localAreas : undefined
      }, session.access_token)
      
      if (generatedAreas && generatedAreas.length > 0) {
        setLocalAreas(generatedAreas)
        setFeedback('')
      }
      
      setTimeout(() => setIsLoading(false), 2000)
    } catch (error) {
      console.error('Failed to regenerate areas with AI:', error)
      setTimeout(() => setIsLoading(false), 1000)
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 80, marginBottom: 24 }}>🚀</Text>
          <Text style={styles.loadingTitle}>
            Refining Areas
          </Text>
          <Text style={styles.loadingDescription}>
            This segments your goal into well defined chunks to make it easy for you to check off goals quicker & see success
          </Text>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} style={{ marginTop: 32 }} />
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <CreateScreenHeader step="areas" />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Review Your Focus Areas
        </Text>

        <Text style={styles.description}>
          We've organised your goal "{dream?.title || 'Your Dream'}" into {localAreas.length} focus areas.
        </Text>

        <Text style={styles.subDescription}>
          Make sure you're happy with them and then we'll review actions within each of them.
        </Text>

        <AreaGrid
          areas={areaSuggestions}
          onEdit={() => {}} // No edit in refine flow
          onRemove={() => {}} // No remove in refine flow
          onAdd={() => {}} // No add in refine flow
          showAddButton={false}
          showEditButtons={false}
          showRemoveButtons={false}
          title=""
        />

      </ScrollView>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Change the areas by providing feedback to our AI below.
        </Text>

        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Provide detailed feedback here for AI to adjust your areas accordingly.."
          multiline
          style={styles.feedbackInput}
        />
        
        <View style={styles.buttonContainer}>
          <Button 
            title="Refine with AI" 
            variant="secondary"
            onPress={handleRefine}
            style={styles.flexButton}
            disabled={!feedback.trim()}
          />
          <Button 
            title="Looks Good"
            variant="black"
            loading={isSaving}
            onPress={() => {
              Keyboard.dismiss()
              handleSaveAreas()
            }}
            style={styles.flexButton}
          />
        </View>
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
    paddingBottom: 400,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.text.primary,
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 18,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: 8,
  },
  subDescription: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 18,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: theme.spacing.xl,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
    lineHeight: 24
  },
  loadingDescription: {
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background.page,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 12,
    lineHeight: 20,
  },
  feedbackInput: {
    minHeight: 60,
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  flexButton: {
    flex: 1,
    borderRadius: theme.radius.xl,
  },
})
