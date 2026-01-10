import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button, Input } from '../../components'
import { AreaGrid } from '../../components/AreaChips'
import { generateAreas, upsertAreas } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { trackEvent } from '../../lib/mixpanel'
import type { Area } from '../../backend/database/types'

interface AreaSuggestion {
  id: string
  title: string
  emoji: string
  selected?: boolean
}

export default function AreasStep() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const navigation = useNavigation<any>()
  const { 
    title, 
    dreamId, 
    areas, 
    setAreas, 
    addArea, 
    updateArea, 
    removeArea,
    areasAnalyzed,
    setAreasAnalyzed,
    setActions,
    start_date,
    end_date,
    baseline,
    obstacles,
    enjoyment
  } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(!areasAnalyzed)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [editingArea, setEditingArea] = useState<string | null>(null)
  const [newAreaTitle, setNewAreaTitle] = useState('')
  const [newAreaEmoji, setNewAreaEmoji] = useState('🚀')
  
  // Convert areas from context to local UI format, sorted by position
  const areaSuggestions: AreaSuggestion[] = areas
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(area => ({
      id: area.id,
      title: area.title,
      emoji: area.icon || '🚀'
    }))

  useFocusEffect(
    React.useCallback(() => {
      const loadAreas = async () => {
        // If we already have areas data, use it
        if (areasAnalyzed && areas.length > 0) {
          setIsLoading(false)
          return
        }

        // Only run analysis if we haven't analyzed yet and have required data
        if (areasAnalyzed || !dreamId || !title) {
          if (!dreamId || !title) {
            setTimeout(() => {
              setIsLoading(false)
            }, 1000)
          }
          return
        }

        const runAnalysis = async () => {
          try {
            const { data: { session } } = await supabaseClient.auth.getSession()
            if (!session?.access_token) {
              throw new Error('No authentication token available')
            }

            const generatedAreas = await generateAreas({ 
              dream_id: dreamId,
              title,
              start_date: start_date || undefined,
              end_date: end_date || undefined,
              baseline: baseline || undefined,
              obstacles: obstacles || undefined,
              enjoyment: enjoyment || undefined
            }, session.access_token)
            
            if (generatedAreas && generatedAreas.length > 0) {
              setAreas(generatedAreas)
              trackEvent('create_dream_areas_generated', { count: generatedAreas.length })
            }
            
            setAreasAnalyzed(true)
            setTimeout(() => setIsLoading(false), 2000)
          } catch (error) {
            console.error('Areas analysis failed:', error)
            setAreasAnalyzed(true)
            
            const defaultAreas = [
              { id: 'temp_1', dream_id: dreamId, title: 'Planning', icon: '📋', position: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              { id: 'temp_2', dream_id: dreamId, title: 'Developing', icon: '🔧', position: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              { id: 'temp_3', dream_id: dreamId, title: 'Launching', icon: '🚀', position: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ]
            setAreas(defaultAreas)
            setTimeout(() => setIsLoading(false), 1000)
          }
        }

        runAnalysis()
      }

      loadAreas()
    }, [dreamId, title, areas, areasAnalyzed, setAreas, setAreasAnalyzed, start_date, end_date, baseline, obstacles, enjoyment])
  )

  const handleAreaEdit = (areaId: string) => {
    const area = areaSuggestions.find(a => a.id === areaId)
    if (area) {
      setEditingArea(areaId)
      setNewAreaTitle(area.title)
      setNewAreaEmoji(area.emoji)
    }
  }

  const handleAddArea = () => {
    setEditingArea('new')
    setNewAreaTitle('')
    setNewAreaEmoji('🚀')
  }

  const handleRemoveArea = (areaId: string) => {
    removeArea(areaId)
  }

  const handleSaveAreas = async () => {
    setIsSaving(true)
    trackEvent('create_dream_areas_approved', { final_count: areas.length })
    
    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          const areasToSend = areas.map((area, index) => {
            const { id, ...areaWithoutId } = area
            const areaToSend = area.id?.startsWith('temp_') ? areaWithoutId : area
            return {
              ...areaToSend,
              position: areaToSend.position ?? index
            }
          })
          
          const response = await upsertAreas({
            dream_id: dreamId,
            areas: areasToSend
          }, session.access_token)
          
          if (response.areas) {
            setAreas(response.areas)
            navigation.navigate('Actions')
          } else {
            navigation.navigate('Actions')
          }
        } else {
          navigation.navigate('Actions')
        }
      } catch (error) {
        console.error('Failed to save areas:', error)
        navigation.navigate('Actions')
      } finally {
        setIsSaving(false)
      }
    } else {
      navigation.navigate('Actions')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 80, marginBottom: 24 }}>🚀</Text>
          <Text style={styles.loadingTitle}>
            Creating Areas
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
          Congratulations, your plan is created
        </Text>

        <Text style={styles.description}>
          We've organised your goal "{title || 'Your Dream'}" into {areas.length} focus areas.
        </Text>

        <Text style={styles.subDescription}>
          Make sure you're happy with them and then we'll create steps within each of them on the next page.
        </Text>

        <AreaGrid
          areas={areaSuggestions}
          onEdit={handleAreaEdit}
          onRemove={handleRemoveArea}
          onAdd={handleAddArea}
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
            onPress={async () => {
              if (!dreamId || !title || !feedback.trim()) return
              
              trackEvent('create_dream_areas_refine', { feedback_length: feedback.length })

              Keyboard.dismiss()
              setIsLoading(true)
              
              try {
                const { data: { session } } = await supabaseClient.auth.getSession()
                if (!session?.access_token) throw new Error('No authentication token available')

                const generatedAreas = await generateAreas({ 
                  dream_id: dreamId,
                  title,
                  start_date: start_date || undefined,
                  end_date: end_date || undefined,
                  baseline: baseline || undefined,
                  obstacles: obstacles || undefined,
                  enjoyment: enjoyment || undefined,
                  feedback: feedback.trim() || undefined,
                  original_areas: areas.length > 0 ? areas : undefined
                }, session.access_token)
                
                if (generatedAreas && generatedAreas.length > 0) {
                  // Clear actions when areas are regenerated since they reference old areas
                  setActions([])
                  setAreas(generatedAreas)
                  setFeedback('')
                }
                
                setTimeout(() => setIsLoading(false), 2000)
              } catch (error) {
                console.error('Failed to regenerate areas with AI:', error)
                setTimeout(() => setIsLoading(false), 1000)
              }
            }}
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
