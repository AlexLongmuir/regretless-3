/**
 * Dream Image Step - Onboarding screen for selecting dream image
 * 
 * Allows users to select or upload an image to associate with their dream
 * This follows the same pattern as the personalize.tsx screen but integrates
 * with the OnboardingContext instead of CreateDreamContext
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { OnboardingHeader } from '../../components/onboarding';
import { Button } from '../../components/Button';
import { getDefaultImages, getDefaultImagesPublic, uploadDreamImage, type DreamImage } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';
import { theme } from '../../utils/theme';
import { trackEvent } from '../../lib/mixpanel';

const DreamImageStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setDreamImageUrl } = useOnboardingContext();
  const [defaultImages, setDefaultImages] = useState<DreamImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(state.dreamImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'dream_image'
      });
    }, [])
  );

  // Update selectedImage when dreamImageUrl changes from context
  useEffect(() => {
    if (state.dreamImageUrl) {
      setSelectedImage(state.dreamImageUrl);
    }
  }, [state.dreamImageUrl]);

  // Load default images on component mount
  useEffect(() => {
    // Check if images are already preloaded
    if (state.preloadedDefaultImages !== null && state.preloadedDefaultImages !== undefined && Array.isArray(state.preloadedDefaultImages)) {
      setDefaultImages(state.preloadedDefaultImages);
      setIsLoading(false);
      return;
    }

    // Fallback to fetching if not preloaded
    const loadDefaultImages = async () => {
      try {
        console.log('🖼️ [DREAM-IMAGE] Starting to load default images...');
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        let response: any;
        
        if (session?.access_token) {
          console.log('🖼️ [DREAM-IMAGE] User authenticated - using authenticated endpoint');
          response = await Promise.race([
            getDefaultImages(session.access_token),
            timeoutPromise
          ]);
        } else {
          console.log('🖼️ [DREAM-IMAGE] User not authenticated - using public endpoint');
          response = await Promise.race([
            getDefaultImagesPublic(),
            timeoutPromise
          ]);
        }
        
        console.log('🖼️ [DREAM-IMAGE] API response:', response);
        
        if (response.success && response.data?.images) {
          console.log('✅ [DREAM-IMAGE] Successfully loaded', response.data.images.length, 'default images');
          setDefaultImages(response.data.images);
        } else {
          console.log('⚠️ [DREAM-IMAGE] API call succeeded but no images found:', response);
          setDefaultImages([]); // Set empty array to show upload option only
        }
      } catch (error) {
        console.error('❌ [DREAM-IMAGE] Error loading default images:', error);
        setDefaultImages([]); // Set empty array on error to show upload option
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultImages();
  }, [state.preloadedDefaultImages]);

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setDreamImageUrl(imageUrl);
  };

  const handleImageUpload = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.access_token) {
            // Create a file object for React Native
            const file = {
              uri: result.assets[0].uri,
              name: result.assets[0].fileName || 'image.jpg',
              type: result.assets[0].type || 'image/jpeg',
              size: result.assets[0].fileSize || 0,
            };

            // For onboarding, we'll use a temporary dream ID since we haven't created the dream yet
            // The actual dream creation will happen later in the flow
            const tempDreamId = 'onboarding-temp-dream';
            const uploadResponse = await uploadDreamImage(file, tempDreamId, session.access_token);
            
            if (uploadResponse.success) {
              setSelectedImage(uploadResponse.data.signed_url);
              setDreamImageUrl(uploadResponse.data.signed_url);
            }
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const handleContinue = () => {
    // Check if an image is selected
    if (!selectedImage) {
      Alert.alert(
        'Image Required',
        'Please select or upload an image to personalize your dream before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to next step
    navigation.navigate('TimeCommitment' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages(prev => new Set(prev).add(imageUrl));
  };

  const renderImageItem = ({ item, index }: { item: DreamImage; index: number }) => {
    const isSelected = selectedImage === item.signed_url;
    const isFirstItem = index === 0;
    // If images are preloaded, assume they're ready (prefetched = cached = instant load)
    const isPreloaded = state.preloadedDefaultImages !== null && state.preloadedDefaultImages !== undefined;
    
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
      );
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
          style={styles.image as any}
          contentFit="cover"
          onLoad={() => handleImageLoad(item.signed_url)}
          transition={isPreloaded ? 0 : 200}
        />
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>
          Personalize your dream
        </Text>

        <Text style={styles.subtitle}>
          Choose an image to represent your dream and keep you motivated: *
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
  );
};

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

export default DreamImageStep;
