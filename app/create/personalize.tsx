import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput, FlatList, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { upsertDream, getDefaultImages, uploadDreamImage, type DreamImage } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'

export default function PersonalizeStep() {
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, setField, preloadedDefaultImages } = useCreateDream()
  const [defaultImages, setDefaultImages] = useState<DreamImage[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(image_url || null)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Update selectedImage when image_url changes from context
  useEffect(() => {
    if (image_url) {
      setSelectedImage(image_url)
    }
  }, [image_url])

  // Load default images on component mount
  useEffect(() => {
    if (preloadedDefaultImages !== null && preloadedDefaultImages !== undefined && Array.isArray(preloadedDefaultImages)) {
      setDefaultImages(preloadedDefaultImages)
      setIsLoading(false)
      return
    }

    const loadDefaultImages = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (!session?.access_token) {
          setIsLoading(false)
          return
        }

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
        
        const response = await Promise.race([
          getDefaultImages(session.access_token),
          timeoutPromise
        ]) as any
        
        if (response.success && response.data?.images) {
          setDefaultImages(response.data.images)
        } else {
          setDefaultImages([]) 
        }
      } catch (error) {
        console.error('Error loading default images:', error)
        setDefaultImages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadDefaultImages()
  }, [preloadedDefaultImages])

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setField('image_url', imageUrl)
  }

  const handleImageUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!')
        return
      }

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
    if (!selectedImage) {
      Alert.alert(
        'Image Required',
        'Please select or upload an image to personalize your dream before continuing.',
        [{ text: 'OK' }]
      )
      return
    }

    navigation.navigate('Questions')

    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          await upsertDream({
            id: dreamId,
            title,
            start_date,
            end_date,
            image_url: selectedImage
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save dream:', error)
      }
    }
  }

  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages(prev => new Set(prev).add(imageUrl))
  }

  const renderImageItem = ({ item, index }: { item: DreamImage; index: number }) => {
    const isSelected = selectedImage === item.signed_url
    const isFirstItem = index === 0
    const isPreloaded = preloadedDefaultImages !== null && preloadedDefaultImages !== undefined
    
    if (isFirstItem) {
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
          onLoad={() => handleImageLoad(item.signed_url)}
          fadeDuration={isPreloaded ? 0 : 200}
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
    <View style={styles.container}>
      <CreateScreenHeader step="personalize" />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>
          Personalize your dream
        </Text>

        <Text style={styles.subtitle}>
          Choose an image: *
        </Text>
        
        <Text style={{ 
          fontSize: 12, 
          color: '#666', 
          marginBottom: 16,
          fontStyle: 'italic'
        }}>
          An image is required to personalize your dream
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading images...</Text>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'upload', name: 'upload' } as DreamImage, ...defaultImages]}
            renderItem={renderImageItem}
            numColumns={3}
            keyExtractor={(item, index) => item.id || `upload-${index}`}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContainer}
          />
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <Button 
          title="Continue"
          variant={selectedImage ? "black" : "outline"}
          onPress={handleContinue}
          disabled={!selectedImage}
          style={styles.button}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing['4xl'],
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 18,
    color: theme.colors.grey[600],
    textAlign: 'left',
    marginBottom: theme.spacing.xl,
  },
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
    width: '30%',
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
    borderColor: theme.colors.primary[600] || '#000000',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.pageBackground,
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});
