import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { upsertDream, getDefaultImages, uploadDreamImage, type DreamImage } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

export default function AreasStep() {
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, setField } = useCreateDream()
  const [defaultImages, setDefaultImages] = useState<DreamImage[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(image_url || null)

  // Update selectedImage when image_url changes from context
  useEffect(() => {
    if (image_url) {
      setSelectedImage(image_url)
    }
  }, [image_url])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load default images on component mount
  useEffect(() => {
    const loadDefaultImages = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          const response = await getDefaultImages(session.access_token)
          if (response.success) {
            setDefaultImages(response.data.images)
          }
        }
      } catch (error) {
        console.error('Error loading default images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDefaultImages()
  }, [])

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setField('image_url', imageUrl)
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

      if (!result.canceled && result.assets[0] && dreamId) {
        setIsUploading(true)
        try {
          const { data: { session } } = await supabaseClient.auth.getSession()
          if (session?.access_token) {
            // Create a file object for React Native
            const file = {
              uri: result.assets[0].uri,
              name: result.assets[0].fileName || 'image.jpg',
              type: result.assets[0].type || 'image/jpeg',
              size: result.assets[0].fileSize || 0,
            }

            const uploadResponse = await uploadDreamImage(file, dreamId, session.access_token)
            
            if (uploadResponse.success) {
              setSelectedImage(uploadResponse.data.signed_url)
              setField('image_url', uploadResponse.data.signed_url)
            }
          }
        } catch (error) {
          console.error('Error uploading image:', error)
          Alert.alert('Error', 'Failed to upload image. Please try again.')
        } finally {
          setIsUploading(false)
        }
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

  const renderImageItem = ({ item, index }: { item: DreamImage; index: number }) => {
    const isSelected = selectedImage === item.signed_url
    const isFirstItem = index === 0
    
    if (isFirstItem) {
      // First item is the upload button
      return (
        <TouchableOpacity
          onPress={handleImageUpload}
          disabled={isUploading}
          style={[
            styles.imageItem,
            styles.uploadButton,
            isUploading && styles.uploadButtonDisabled
          ]}
        >
          {isUploading ? (
            <Ionicons name="hourglass-outline" size={24} color={theme.colors.grey[500]} />
          ) : (
            <Ionicons name="add" size={24} color={theme.colors.grey[900]} />
          )}
          <Text style={[styles.uploadText, isUploading && styles.uploadTextDisabled]}>
            {isUploading ? 'Uploading...' : 'Add'}
          </Text>
        </TouchableOpacity>
      )
    }
    
    return (
      <TouchableOpacity
        onPress={() => handleImageSelect(item.signed_url)}
        style={[
          styles.imageItem,
          isSelected && styles.selectedImageItem
        ]}
      >
        <Image
          source={{ uri: item.signed_url }}
          style={styles.image}
          resizeMode="cover"
        />
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
          </View>
        )}
      </TouchableOpacity>
    )
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

        <Text style={{ 
          fontSize: 14, 
          fontWeight: '600', 
          color: '#000', 
          marginBottom: 16 
        }}>
          Choose an image:
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading images...</Text>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'upload', name: 'upload' } as DreamImage, ...defaultImages]}
            renderItem={renderImageItem}
            numColumns={4}
            keyExtractor={(item, index) => item.id || `upload-${index}`}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContainer}
          />
        )}
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

const styles = {
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.grey[600],
  },
  gridContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageItem: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    position: 'relative',
  },
  uploadButton: {
    backgroundColor: theme.colors.surface[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.grey[200],
    borderStyle: 'dashed',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    fontSize: 12,
    color: theme.colors.grey[900],
    marginTop: 4,
    fontWeight: '500',
  },
  uploadTextDisabled: {
    color: theme.colors.grey[500],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectedImageItem: {
    borderWidth: 3,
    borderColor: theme.colors.primary || '#000',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
}
