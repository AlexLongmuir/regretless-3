import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { useToast } from '../../components/toast/ToastProvider'
import { Input } from '../../components/Input'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

const dreamPresets = [
  { emoji: '✍️', title: 'Write a book' },
  { emoji: '📚', title: 'Publish a novel' },
  { emoji: '📝', title: 'Draft a screenplay' },
  { emoji: '🎨', title: 'Illustrate a children\'s story' },
  { emoji: '📖', title: 'Edit a biography' },
  { emoji: '📅', title: 'Plan a writing workshop' },
]

export default function TitleStep() {
  const { title, dreamId, start_date, end_date, image_url, setField } = useCreateDream()
  const navigation = useNavigation<any>()
  const toast = useToast()
  const handlePresetSelect = (presetTitle: string) => {
    setField('title', presetTitle)
  }

  const handleContinue = async () => {
    Keyboard.dismiss(); // Close keyboard when continuing
    if (!title.trim()) {
      toast.show('Add a title')
      return
    }

    // Navigate immediately for smooth UX
    navigation.navigate('Personalize')

    // Handle backend operations in background
    if (!dreamId) {
      // Create dream in background
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (!session?.access_token) {
          toast.show('Please log in to continue')
          return
        }

        const result = await upsertDream({
          title: title.trim(),
          start_date,
          end_date,
          image_url
        }, session.access_token)

        if (result?.id) {
          setField('dreamId', result.id)
        }
      } catch (error) {
        console.error('Failed to create dream:', error)
        // Could show a subtle error notification here if needed
      }
    }
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <CreateScreenHeader step="title" />
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
          marginBottom: 24,
          lineHeight: 24
        }}>
          Let us know what your dream is
        </Text>
        
        <Input 
          placeholder="Start writing..." 
          value={title}
          onChangeText={(t) => setField('title', t)}
          variant="borderless"
          multiline={true}
          style={{ 
            minHeight: 44,
            marginBottom: 32
          }}
        />

        <Text style={{ 
          fontSize: 12, 
          fontWeight: '600', 
          color: '#000', 
          marginBottom: 16 
        }}>
          Here's also some ideas for you:
        </Text>

        <View style={{ gap: 8 }}>
          {dreamPresets.map((preset, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handlePresetSelect(preset.title)}
              style={{
                backgroundColor: 'white',
                height: 44,
                paddingHorizontal: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12
              }}
            >
              <Text style={{ fontSize: 16 }}>{preset.emoji}</Text>
              <Text style={{ fontSize: 14, color: '#000' }}>{preset.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
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


