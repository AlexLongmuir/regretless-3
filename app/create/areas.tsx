import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button, Input } from '../../components'
import { AreaGrid } from '../../components/AreaChips'

interface AreaSuggestion {
  id: string
  title: string
  emoji: string
  selected?: boolean
}

export default function AreasStep() {
  const navigation = useNavigation<any>()
  const { title, setField } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [editingArea, setEditingArea] = useState<string | null>(null)
  const [newAreaTitle, setNewAreaTitle] = useState('')
  const [newAreaEmoji, setNewAreaEmoji] = useState('🚀')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [areaSuggestions, setAreaSuggestions] = useState<AreaSuggestion[]>([
    { id: '1', title: 'Planning', emoji: '✍️' },
    { id: '2', title: 'Developing', emoji: '🔧' },
    { id: '3', title: 'Launching', emoji: '🚀' },
    { id: '4', title: 'Marketing', emoji: '📢' }
  ])

  const emojiOptions = ['🚀', '✍️', '🔧', '📢', '📚', '💡', '🎯', '⚡', '🔥', '💪', '🎨', '📈', '🌟', '🎉', '💎', '🏆']

  useEffect(() => {
    // Simulate API call with minimum 3 second loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

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
      setAreaSuggestions(prev => 
        prev.map(area => 
          area.id === editingArea 
            ? { ...area, title: newAreaTitle.trim(), emoji: newAreaEmoji.trim() }
            : area
        )
      )
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
    if (newAreaTitle.trim() && newAreaEmoji.trim()) {
      const maxId = areaSuggestions.length > 0 
        ? Math.max(...areaSuggestions.map(a => parseInt(a.id))) 
        : 0
      const newId = (maxId + 1).toString()
      setAreaSuggestions(prev => [
        ...prev,
        { id: newId, title: newAreaTitle.trim(), emoji: newAreaEmoji.trim() }
      ])
      setEditingArea(null)
      setNewAreaTitle('')
      setNewAreaEmoji('')
    }
  }

  const handleRemoveArea = (areaId: string) => {
    setAreaSuggestions(prev => prev.filter(area => area.id !== areaId))
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
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
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <CreateScreenHeader step="areas" />
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
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
          marginBottom: 32,
          lineHeight: 22
        }}>
          These are the area's we think maximise your chance of success.
        </Text>

        {/* Area Grid */}
        <AreaGrid
          areas={areaSuggestions}
          onEdit={handleAreaEdit}
          onRemove={handleRemoveArea}
          onAdd={handleAddArea}
        />

      </ScrollView>
      
      {/* Sticky bottom section */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#F3F4F6'
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
            onPress={() => {
              // Trigger loading page
              setIsLoading(true)
              // Simulate AI processing
              setTimeout(() => {
                setIsLoading(false)
              }, 3000)
            }}
            style={{ flex: 1 }}
          />
          <Button 
            title="Looks Good" 
            variant="black"
            onPress={() => navigation.navigate('AreasConfirm')}
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
            backgroundColor: '#F3F4F6',
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
            backgroundColor: '#F3F4F6',
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
    </View>
  )
}
