import React, { useState, useRef, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, FlatList, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { upsertDream, getPrecreatedFigurines, uploadSelfieForFigurine, type Figurine } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'

export default function PersonalizeStep() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, figurineUrl, setField } = useCreateDream()
  const [precreatedFigurines, setPrecreatedFigurines] = useState<Figurine[]>([])
  const [selectedFigurine, setSelectedFigurine] = useState<string | null>(figurineUrl || null)
  const [userGeneratedFigurine, setUserGeneratedFigurine] = useState<Figurine | null>(null)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Update selectedFigurine when figurineUrl changes from context
  useEffect(() => {
    if (figurineUrl) {
      setSelectedFigurine(figurineUrl)
    }
  }, [figurineUrl])

  // Load precreated figurines on component mount
  useEffect(() => {
    const loadPrecreatedFigurines = async () => {
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
          getPrecreatedFigurines(session.access_token),
          timeoutPromise
        ]) as any
        
        if (response.success && response.data?.figurines) {
          setPrecreatedFigurines(response.data.figurines)
        } else {
          setPrecreatedFigurines([])
        }
      } catch (error) {
        console.error('Error loading precreated figurines:', error)
        setPrecreatedFigurines([])
      } finally {
        setIsLoading(false)
      }
    }

    loadPrecreatedFigurines()
  }, [])

  const handleFigurineSelect = (figurineUrl: string) => {
    setSelectedFigurine(figurineUrl)
    setField('figurineUrl', figurineUrl)
  }

  const handleSelfieUpload = async () => {
    try {
      // Show action sheet to choose camera or photo library
      Alert.alert(
        'Add Photo',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
              if (cameraPermission.granted === false) {
                Alert.alert('Permission Required', 'Permission to access camera is required!')
                return
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              })
              if (!result.canceled && result.assets[0]) {
                await processImage(result.assets[0])
              }
            }
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
              if (libraryPermission.granted === false) {
                Alert.alert('Permission Required', 'Permission to access photo library is required!')
                return
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              })
              if (!result.canceled && result.assets[0]) {
                await processImage(result.assets[0])
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.')
      console.error('Image picker error:', error)
    }
  }

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true)
    setIsGenerating(true)
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (session?.access_token) {
        const file = {
          uri: asset.uri,
          name: asset.fileName || 'selfie.jpg',
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        }

        const uploadResponse = await uploadSelfieForFigurine(file, session.access_token)
        
        if (uploadResponse.success && uploadResponse.data) {
          const generatedFigurine: Figurine = {
            id: uploadResponse.data.id || `generated-${Date.now()}`,
            name: 'Your Custom Figurine',
            signed_url: uploadResponse.data.signed_url,
            path: (uploadResponse.data as any).path || uploadResponse.data.id || ''
          }
          setUserGeneratedFigurine(generatedFigurine)
          setSelectedFigurine(uploadResponse.data.signed_url)
          setField('figurineUrl', uploadResponse.data.signed_url)
          console.log('✅ [PERSONALIZE] Generated figurine added to list:', generatedFigurine)
        } else {
          Alert.alert('Error', uploadResponse.message || 'Failed to generate figurine. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error uploading selfie:', error)
      Alert.alert('Error', 'Failed to generate figurine. Please try again.')
    } finally {
      setIsUploading(false)
      setIsGenerating(false)
    }
  }

  const handleContinue = async () => {
    if (!selectedFigurine) {
      Alert.alert(
        'Figurine Required',
        'Please upload a photo of yourself or select a figurine to personalize your dream before continuing.',
        [{ text: 'OK' }]
      )
      return
    }

    navigation.navigate('Questions')

    // Note: Dream image will be generated later after areas are created
    // For now, we just store the figurine URL
  }

  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages(prev => new Set(prev).add(imageUrl))
  }

  const renderFigurineItem = ({ item }: { item: Figurine | { id: string; name: string } }) => {
    const isUploadButton = item.id === 'upload' || (item as any).name === 'upload'
    
    if (isUploadButton) {
      return (
        <TouchableOpacity
          onPress={handleSelfieUpload}
          disabled={isUploading || isGenerating}
          style={[
            styles.uploadButton,
            (isUploading || isGenerating) && styles.uploadButtonDisabled
          ]}
        >
          {(isUploading || isGenerating) ? (
            <View style={styles.uploadButtonContent}>
              <Ionicons name="hourglass-outline" size={20} color={theme.colors.text.tertiary} />
              <Text style={[styles.uploadText, styles.uploadTextDisabled]}>
                {isGenerating ? 'Generating...' : 'Uploading...'}
              </Text>
            </View>
          ) : (
            <View style={styles.uploadButtonContent}>
              <Ionicons name="camera-outline" size={20} color={theme.colors.text.primary} />
              <Text style={styles.uploadText}>
                Upload or Take Photo of Yourself
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )
    }
    
    // Render figurine (full width)
    const figurine = item as Figurine
    const isSelected = selectedFigurine === figurine.signed_url
    
    return (
      <TouchableOpacity
        onPress={() => handleFigurineSelect(figurine.signed_url)}
        style={[
          styles.imageItem,
          isSelected && styles.selectedImageItem
        ]}
      >
        <Image
          source={{ uri: figurine.signed_url }}
          style={styles.image}
          contentFit="cover"
          onLoad={() => handleImageLoad(figurine.signed_url)}
          transition={200}
        />
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
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
          Upload a photo of yourself to create a custom figurine, or choose a precreated one
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading figurines...</Text>
          </View>
        ) : (
          <View style={styles.figurinesContainer}>
            <FlatList
              data={[
                { id: 'upload', name: 'upload' } as Figurine,
                ...(userGeneratedFigurine ? [userGeneratedFigurine] : []),
                ...precreatedFigurines
              ]}
              renderItem={renderFigurineItem}
              keyExtractor={(item, index) => item.id || `figurine-${index}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <Button 
          title="Continue"
          variant={selectedFigurine ? "black" : "outline"}
          onPress={handleContinue}
          disabled={!selectedFigurine || isGenerating}
          style={styles.button}
        />
      </View>
    </View>
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
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing['4xl'],
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
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: 18,
    color: theme.colors.text.secondary,
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
    color: theme.colors.text.secondary,
  },
  figurinesContainer: {
    width: '100%',
  },
  separator: {
    height: theme.spacing.md,
  },
  imageItem: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.card,
    position: 'relative',
  },
  uploadButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  uploadButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  uploadTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectedImageItem: {
    borderWidth: 3,
    borderColor: theme.colors.primary[600],
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
    backgroundColor: theme.colors.background.page,
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});
