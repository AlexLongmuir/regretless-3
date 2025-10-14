import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button, Input } from '../../components'
import { AreaGrid } from '../../components/AreaChips'
import { generateAreas, upsertAreas } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'
import type { Area } from '../../backend/database/types'

interface AreaSuggestion {
  id: string
  title: string
  emoji: string
  selected?: boolean
}

export default function AreasStep() {
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // Convert areas from context to local UI format, sorted by position
  const areaSuggestions: AreaSuggestion[] = areas
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(area => ({
      id: area.id,
      title: area.title,
      emoji: area.icon || '🚀'
    }))

  const emojiOptions = ['🚀', '✍️', '🔧', '📢', '📚', '💡', '🎯', '⚡', '🔥', '💪', '🎨', '📈', '🌟', '🎉', '💎', '🏆']

  useFocusEffect(
    React.useCallback(() => {
      const loadAreas = async () => {
        // If we already have areas data, use it
        if (areasAnalyzed && areas.length > 0) {
          console.log('🔍 Using existing areas data from context')
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
          console.log('🔍 Running areas analysis for the first time')
          
          try {
            // Get auth token
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
              // Store the full Area objects in context
              setAreas(generatedAreas)
            }
            
            // Mark as analyzed
            setAreasAnalyzed(true)
            
            // Simulate minimum loading time for UX
            setTimeout(() => {
              setIsLoading(false)
            }, 2000)
          } catch (error) {
            console.error('Areas analysis failed:', error)
            // Mark as analyzed even if failed to prevent retries
            setAreasAnalyzed(true)
            
            // Fallback to default areas if AI fails
            const defaultAreas = [
              { id: 'temp_1', dream_id: dreamId, title: 'Planning', icon: '📋', position: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              { id: 'temp_2', dream_id: dreamId, title: 'Developing', icon: '🔧', position: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
              { id: 'temp_3', dream_id: dreamId, title: 'Launching', icon: '🚀', position: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            ]
            setAreas(defaultAreas)
            setTimeout(() => {
              setIsLoading(false)
            }, 1000)
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

  const handleSaveEdit = () => {
    if (editingArea && newAreaTitle.trim() && newAreaEmoji.trim()) {
      // Update the area in context - this will update live
      updateArea(editingArea, {
        title: newAreaTitle.trim(),
        icon: newAreaEmoji.trim()
      })
      setEditingArea(null)
      setNewAreaTitle('')
      setNewAreaEmoji('')
    }
  }

  const handleCancelEdit = () => {
    setEditingArea(null)
    setNewAreaTitle('')
    setNewAreaEmoji('')
  }

  const handleAddArea = () => {
    setEditingArea('new')
    setNewAreaTitle('')
    setNewAreaEmoji('🚀')
  }

  const handleSaveNewArea = () => {
    if (newAreaTitle.trim() && newAreaEmoji.trim() && dreamId) {
      const newId = `temp_${Date.now()}` // Temporary ID until saved to backend
      const newArea: Area = {
        id: newId,
        dream_id: dreamId,
        title: newAreaTitle.trim(),
        icon: newAreaEmoji.trim(),
        position: areas.length, // Add at the end
        deleted_at: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Add to context - this will update live
      addArea(newArea)
      setEditingArea(null)
      setNewAreaTitle('')
      setNewAreaEmoji('')
    }
  }

  const handleRemoveArea = (areaId: string) => {
    // Remove from context - this will update live and also remove related actions
    removeArea(areaId)
  }

  const handleReorderAreas = (reorderedAreas: AreaSuggestion[]) => {
    // Update positions based on new order
    const updatedAreas = reorderedAreas.map((area, index) => {
      const originalArea = areas.find(a => a.id === area.id)
      if (originalArea) {
        return { ...originalArea, position: index }
      }
      return originalArea
    }).filter(Boolean) as Area[]
    
    setAreas(updatedAreas)
  }


  const handleSaveAreas = async () => {
    setIsSaving(true)
    
    // Save areas to backend first, then navigate
    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          // Remove temporary IDs for new areas and ensure positions are set
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
          
          // Update context with real IDs from backend BEFORE navigating
          if (response.areas) {
            setAreas(response.areas)
            // Navigate after successful save and context update
            navigation.navigate('AreasConfirm')
          } else {
            // If no response, still navigate
            navigation.navigate('AreasConfirm')
          }
        } else {
          // If no session, just navigate
          navigation.navigate('AreasConfirm')
        }
      } catch (error) {
        console.error('Failed to save areas:', error)
        // Still navigate even if save fails
        navigation.navigate('AreasConfirm')
      } finally {
        setIsSaving(false)
      }
    } else {
      // If no dreamId, just navigate
      navigation.navigate('AreasConfirm')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          {/* Rocket Icon */}
          <Text style={{ fontSize: 80, marginBottom: 24 }}>🚀</Text>
          
          {/* Title */}
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: '#000', 
            marginBottom: 16,
            lineHeight: 24
          }}>
            Creating Areas
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            This segments your goal into well defined chunks to make it easy for you to check off goals quicker & see success
          </Text>
          
          {/* Loading indicator */}
          <ActivityIndicator 
            size="large" 
            color="#000" 
            style={{ marginTop: 32 }} 
          />
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <CreateScreenHeader step="areas" />
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Dream Title */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 24,
          lineHeight: 24
        }}>
          {title || '[Dream Name]'}
        </Text>

        {/* Intro Text */}
        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          marginBottom: 16,
          lineHeight: 22
        }}>
          These are the area's we think maximise your chance of success.
        </Text>

        {/* Reorder Instructions */}
        <Text style={{ 
          fontSize: 14, 
          color: '#666', 
          marginBottom: 16,
          lineHeight: 20
        }}>
          Use the up/down arrows to reorder areas
        </Text>

        {/* Area Grid */}
        <AreaGrid
          areas={areaSuggestions}
          onEdit={handleAreaEdit}
          onRemove={handleRemoveArea}
          onAdd={handleAddArea}
          onReorder={handleReorderAreas}
        />

      </ScrollView>
      
      {/* Footer section */}
      <View style={{ 
        paddingHorizontal: 16,
        paddingBottom: 32,
        backgroundColor: theme.colors.pageBackground
      }}>
        {/* Instructional Text */}
        <Text style={{ 
          fontSize: 14, 
          color: '#000', 
          marginBottom: 12,
          lineHeight: 20
        }}>
          Use the edit buttons on each area to customize them, or provide feedback to our AI below.
        </Text>

        {/* Feedback Input */}
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Provide detailed feedback here for AI to adjust your areas accordingly.."
          multiline
          style={{ 
            minHeight: 60,
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            fontSize: 16,
            textAlignVertical: 'top'
          }}
        />
        
        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button 
            title="Fix with AI" 
            variant="secondary"
            onPress={async () => {
              if (!dreamId || !title || !feedback.trim()) return
              
              Keyboard.dismiss() // Close keyboard when AI fix is triggered
              
              // Trigger loading page
              setIsLoading(true)
              
              try {
                // Get auth token
                const { data: { session } } = await supabaseClient.auth.getSession()
                if (!session?.access_token) {
                  throw new Error('No authentication token available')
                }

                // Call the generateAreas API to regenerate areas
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
                  // Store the new areas in context
                  setAreas(generatedAreas)
                  // Clear feedback after successful regeneration
                  setFeedback('')
                }
                
                // Simulate minimum loading time for UX
                setTimeout(() => {
                  setIsLoading(false)
                }, 2000)
              } catch (error) {
                console.error('Failed to regenerate areas with AI:', error)
                setTimeout(() => {
                  setIsLoading(false)
                }, 1000)
              }
            }}
            style={{ flex: 1 }}
            disabled={!feedback.trim()}
          />
          <Button 
            title={isSaving ? "Saving..." : "Looks Good"}
            variant="black"
            onPress={() => {
              Keyboard.dismiss() // Close keyboard when continuing
              handleSaveAreas()
            }}
            disabled={isSaving}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editingArea !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: theme.colors.pageBackground,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#000',
              marginBottom: 20,
              textAlign: 'center'
            }}>
              {editingArea === 'new' ? 'Add New Area' : 'Edit Area'}
            </Text>

            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#000',
              marginBottom: 8
            }}>
              Emoji:
            </Text>
            <TouchableOpacity
              onPress={() => setShowEmojiPicker(true)}
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                minHeight: 60
              }}
            >
              <Text style={{ fontSize: 32 }}>
                {newAreaEmoji}
              </Text>
            </TouchableOpacity>

            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#000',
              marginBottom: 8
            }}>
              Title:
            </Text>
            <TextInput
              value={newAreaTitle}
              onChangeText={setNewAreaTitle}
              placeholder="Enter area title"
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                marginBottom: 24
              }}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={handleCancelEdit}
                style={{ flex: 1 }}
              />
              <Button
                title={editingArea === 'new' ? 'Add' : 'Save'}
                variant="black"
                onPress={editingArea === 'new' ? handleSaveNewArea : handleSaveEdit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: theme.colors.pageBackground,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 350
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#000',
              marginBottom: 20,
              textAlign: 'center'
            }}>
              Choose Emoji
            </Text>

            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12
            }}>
              {emojiOptions.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setNewAreaEmoji(emoji)
                    setShowEmojiPicker(false)
                  }}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: 16,
                    minWidth: 60,
                    minHeight: 60,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 20 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowEmojiPicker(false)}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}
