/**
 * Personalize Step - Create flow screen for generating dream image
 * 
 * Uses the user's existing figurine to generate a dream-specific image,
 * or allows users to upload their own image
 */

import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { generateDreamImage } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'

export default function PersonalizeStep() {
  const { theme, isDark } = useTheme()
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark])
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, setField } = useCreateDream()
  const [userFigurineUrl, setUserFigurineUrl] = useState<string | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(image_url || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null)

  // Get background image URL from Supabase storage
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/AchievementsBackground.png`;
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  // Prefetch background image
  useEffect(() => {
    if (backgroundImageUrl) {
      Image.prefetch(backgroundImageUrl);
    }
  }, [backgroundImageUrl]);

  // Load user's figurine from profile
  useEffect(() => {
    const loadUserFigurine = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (user) {
          const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('figurine_url')
            .eq('user_id', user.id)
            .single()

          if (!error && profile?.figurine_url) {
            setUserFigurineUrl(profile.figurine_url)
          }
        }
      } catch (error) {
        console.error('Error loading user figurine:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserFigurine()
  }, [])

  const handleImageUpload = async () => {
    try {
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
                setUploadedImageUri(result.assets[0].uri)
                setSelectedImageUrl(result.assets[0].uri)
                setField('image_url', result.assets[0].uri)
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
                setUploadedImageUri(result.assets[0].uri)
                setSelectedImageUrl(result.assets[0].uri)
                setField('image_url', result.assets[0].uri)
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

  const handleGenerateFromFigurine = async () => {
    if (!userFigurineUrl) {
      Alert.alert('Error', 'No figurine found. Please upload an image instead.')
      return
    }

    if (!dreamId) {
      Alert.alert('Error', 'Dream not created yet. Please try again.')
      return
    }

    setIsGenerating(true)
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (session?.access_token) {
        const dreamContext = title // Use title as context for now

        const response = await generateDreamImage(
          userFigurineUrl,
          title,
          dreamContext,
          dreamId,
          session.access_token
        )

        if (response.success && response.data) {
          setSelectedImageUrl(response.data.signed_url)
          setField('image_url', response.data.signed_url)
        } else {
          Alert.alert('Error', 'Failed to generate dream image. Please try uploading an image instead.')
        }
      }
    } catch (error) {
      console.error('Error generating dream image:', error)
      Alert.alert('Error', 'Failed to generate dream image. Please try uploading an image instead.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleContinue = async () => {
    if (!selectedImageUrl) {
      Alert.alert(
        'Image Required',
        'Please generate an image from your character or upload your own image to continue.',
        [{ text: 'OK' }]
      )
      return
    }

    navigation.navigate('Questions')
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Background Image */}
      {backgroundImageUrl && (
        <Image 
          source={{ uri: backgroundImageUrl }} 
          style={styles.backgroundImage}
          contentFit="cover"
          cachePolicy="disk"
          transition={0}
          priority="high"
        />
      )}
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CreateScreenHeader step="personalize" />
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            Make this dream yours
          </Text>

          <Text style={styles.subtitle}>
            Generate a personalized image from your character, or upload your own image
          </Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.contentArea}>
              {/* Show user's figurine first, then replace with dream-specific image when generated */}
              {userFigurineUrl && !selectedImageUrl && (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: userFigurineUrl }}
                    style={styles.dreamImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </View>
              )}

              {/* Generated or Uploaded Image */}
              {selectedImageUrl && (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: selectedImageUrl }}
                    style={styles.dreamImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </View>
              )}

              {/* Generate from Figurine Button */}
              {userFigurineUrl && !selectedImageUrl && (
                <TouchableOpacity
                  onPress={handleGenerateFromFigurine}
                  disabled={isGenerating}
                  style={[
                    styles.generateButton,
                    isGenerating && styles.generateButtonDisabled
                  ]}
                >
                  {isGenerating ? (
                    <View style={styles.buttonContent}>
                      <Ionicons name="hourglass-outline" size={20} color={isDark ? theme.colors.text.secondary : '#D1D5DB'} />
                      <Text style={[styles.buttonText, styles.buttonTextDisabled]}>
                        Generating...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons name="sparkles-outline" size={20} color={isDark ? theme.colors.text.primary : '#F9FAFB'} />
                      <Text style={styles.buttonText}>
                        Generate from your character
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Upload Image Section - Collapsible and subtle */}
              <View style={styles.uploadSection}>
                <TouchableOpacity
                  onPress={handleImageUpload}
                  style={styles.uploadButton}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="image-outline" size={20} color={isDark ? theme.colors.text.secondary : '#D1D5DB'} />
                    <Text style={styles.uploadText}>
                      Or upload your own image
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Add spacing area before button */}
          <View style={styles.spacingArea} />
        </ScrollView>
      </SafeAreaView>
      
      {/* Footer with button */}
      <View style={styles.footer}>
        <Button 
          title="Continue"
          variant={selectedImageUrl ? "black" : "outline"}
          onPress={handleContinue}
          disabled={!selectedImageUrl || isGenerating}
          style={styles.button}
        />
      </View>
    </View>
  )
}

const createStyles = (theme: Theme, isDark?: boolean) => {
  const screenWidth = Dimensions.get('window').width;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.colors.background.page : '#1A1A1A',
      position: 'relative',
    },
    backgroundImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
    },
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
      zIndex: 1,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['4xl'],
      flexGrow: 1,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: isDark ? theme.colors.text.primary : '#F9FAFB',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? theme.colors.text.secondary : '#D1D5DB',
      lineHeight: 22,
      marginBottom: theme.spacing.xl,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: isDark ? theme.colors.text.secondary : '#D1D5DB',
    },
    contentArea: {
      width: '100%',
    },
    imageContainer: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.background.card,
      marginBottom: theme.spacing.lg,
    },
    dreamImage: {
      width: '100%',
      height: '100%',
    },
    generateButton: {
      width: '100%',
      height: 56,
      backgroundColor: isDark ? theme.colors.background.card : 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
      marginBottom: theme.spacing.md,
    },
    generateButtonDisabled: {
      opacity: 0.5,
    },
    uploadSection: {
      marginTop: theme.spacing.lg,
    },
    uploadButton: {
      width: '100%',
      height: 56,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: isDark ? theme.colors.border.default : 'rgba(255, 255, 255, 0.1)',
      borderStyle: 'dashed',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    buttonText: {
      fontSize: 16,
      color: isDark ? theme.colors.text.primary : '#F9FAFB',
      fontWeight: '500',
    },
    buttonTextDisabled: {
      color: isDark ? theme.colors.text.tertiary : '#9CA3AF',
    },
    uploadText: {
      fontSize: 16,
      color: isDark ? theme.colors.text.secondary : '#D1D5DB',
      fontWeight: '400',
    },
    spacingArea: {
      height: theme.spacing['4xl'],
    },
    footer: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: BOTTOM_NAV_PADDING,
      backgroundColor: isDark ? theme.colors.background.page : '#1A1A1A',
      zIndex: 2,
    },
    button: {
      width: '100%',
      borderRadius: theme.radius.xl,
    },
  });
};
