import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { useToast } from '../../components/toast/ToastProvider'
import { Input } from '../../components/Input'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { EmojiListRow } from '../../components'
import { upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

const dreamPresets = [
  { emoji: '💰', text: 'Launch my online business that generates £1,000 / month' },
  { emoji: '🌍', text: 'Travel to every continent' },
  { emoji: '🗣️', text: 'Become proficient in a new language and have a 10-minute conversation' },
  { emoji: '💻', text: 'Learn to code and build my first website in 4 months' },
  { emoji: '🏠', text: 'Save £25,000 for a house deposit' },
  { emoji: '📚', text: 'Read and apply principles from one new book each month for a year' },
  { emoji: '🎹', text: 'Learn to play 3 complete songs on piano' },
  { emoji: '👥', text: 'Overcome social anxiety and handle stress better in all situations' },
  { emoji: '🍳', text: 'Learn to cook 20 authentic dishes from different cuisines' },
  { emoji: '📸', text: 'Master photography and take 50 portfolio-worthy photos' },
  { emoji: '🌅', text: 'Transform my daily habits and build a sustainable morning routine' },
];

export default function TitleStep() {
  const { title, dreamId, start_date, end_date, image_url, setField } = useCreateDream()
  const navigation = useNavigation<any>()
  const toast = useToast()
  const scrollViewRef = useRef<ScrollView>(null)
  
  const handlePresetSelect = (text: string) => {
    setField('title', text)
    // Scroll to top to show the input field
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true })
    }, 100)
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
        ref={scrollViewRef}
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
          What's the dream you want to achieve?
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
          Frequently chosen goals
        </Text>

        <View style={{ gap: 8 }}>
          {dreamPresets.map((preset, index) => (
            <EmojiListRow
              key={index}
              emoji={preset.emoji}
              text={preset.text}
              type="select"
              onSelect={handlePresetSelect}
            />
          ))}
        </View>
      </ScrollView>
      
      {/* Footer with button */}
      <View style={{ 
        paddingHorizontal: 16,
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


