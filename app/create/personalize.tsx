import React, { useState, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

export default function AreasStep() {
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, setField } = useCreateDream()
  const [selectedEmoji, setSelectedEmoji] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState<string | null>(image_url || null)
  const textInputRef = useRef<TextInput>(null)

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji)
    setSelectedImage(null) // Clear image when emoji is selected
    setField('image_url', emoji)
  }

  const handleImageUpload = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!')
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        setSelectedImage(imageUri)
        setSelectedEmoji('') // Clear emoji when image is selected
        setField('image_url', imageUri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.')
      console.error('Image picker error:', error)
    }
  }

  const handleContinue = async () => {
    // Navigate immediately for smooth UX
    navigation.navigate('Dates')

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
            image_url
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save dream:', error)
      }
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
      <CreateScreenHeader step="personalize" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 32,
          lineHeight: 24
        }}>
          Personalize your dream
        </Text>

        {/* Emoji selection */}
        <Text style={{ 
          fontSize: 14, 
          fontWeight: '600', 
          color: '#000', 
          marginBottom: 16 
        }}>
          Choose an emoji:
        </Text>
        
        <TouchableOpacity
          onPress={() => {
            // Focus the hidden TextInput to open emoji keyboard
            if (textInputRef.current) {
              textInputRef.current.focus()
            }
          }}
          style={{
            backgroundColor: 'white',
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32
          }}
        >
          <Text style={{ fontSize: 16, color: selectedEmoji ? '#000' : '#666' }}>
            {selectedEmoji ? selectedEmoji : '😀 Choose Emoji'}
          </Text>
        </TouchableOpacity>
        
        {/* Hidden TextInput for emoji input */}
        <TextInput
          ref={textInputRef}
          value={selectedEmoji}
          onChangeText={(text) => {
            // Only allow single emoji
            const emoji = text.slice(-1)
            if (emoji && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(emoji)) {
              setSelectedEmoji(emoji)
              setSelectedImage(null)
              setField('image_url', emoji)
            }
          }}
          style={{
            position: 'absolute',
            left: -1000,
            opacity: 0,
            height: 0,
            width: 0
          }}
          multiline={false}
          maxLength={1}
          keyboardType="default"
          returnKeyType="done"
        />

        {/* Image upload option */}
        <Text style={{ 
          fontSize: 14, 
          fontWeight: '600', 
          color: '#000', 
          marginBottom: 16 
        }}>
          Or upload an image:
        </Text>
        
        <TouchableOpacity
          onPress={handleImageUpload}
          style={{
            backgroundColor: 'white',
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text style={{ fontSize: 16, color: '#666' }}>📷 Upload Image</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32
      }}>
        <Button 
          title="Continue"
          variant={"black" as any}
          onPress={handleContinue}
        />
      </View>
    </View>
  )
}
