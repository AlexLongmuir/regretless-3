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
import { getPrecreatedFigurines, uploadSelfieForFigurine, type Figurine } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';
import { theme } from '../../utils/theme';
import { trackEvent } from '../../lib/mixpanel';

const DreamImageStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setDreamImageUrl, setFigurineUrl } = useOnboardingContext();
  const [precreatedFigurines, setPrecreatedFigurines] = useState<Figurine[]>([]);
  const [selectedFigurine, setSelectedFigurine] = useState<string | null>(state.figurineUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Update selectedFigurine when figurineUrl changes from context
  useEffect(() => {
    if (state.figurineUrl) {
      setSelectedFigurine(state.figurineUrl);
    }
  }, [state.figurineUrl]);

  // Load precreated figurines on component mount
  useEffect(() => {
    const loadPrecreatedFigurines = async () => {
      try {
        console.log('🖼️ [DREAM-IMAGE] Starting to load precreated figurines...');
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const response = await Promise.race([
          getPrecreatedFigurines(session?.access_token),
          timeoutPromise
        ]) as any;
        
        console.log('🖼️ [DREAM-IMAGE] API response:', response);
        
        if (response.success && response.data?.figurines) {
          console.log('✅ [DREAM-IMAGE] Successfully loaded', response.data.figurines.length, 'precreated figurines');
          setPrecreatedFigurines(response.data.figurines);
        } else {
          console.log('⚠️ [DREAM-IMAGE] API call succeeded but no figurines found:', response);
          setPrecreatedFigurines([]);
        }
      } catch (error) {
        console.error('❌ [DREAM-IMAGE] Error loading precreated figurines:', error);
        setPrecreatedFigurines([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrecreatedFigurines();
  }, []);

  const handleFigurineSelect = (figurineUrl: string) => {
    setSelectedFigurine(figurineUrl);
    setFigurineUrl(figurineUrl);
  };

  const handleSelfieUpload = async () => {
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
        setIsGenerating(true);
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.access_token) {
            // Create a file object for React Native
            const file = {
              uri: result.assets[0].uri,
              name: result.assets[0].fileName || 'selfie.jpg',
              type: result.assets[0].type || 'image/jpeg',
              size: result.assets[0].fileSize || 0,
            };

            const uploadResponse = await uploadSelfieForFigurine(file, session.access_token);
            
            if (uploadResponse.success) {
              setSelectedFigurine(uploadResponse.data.signed_url);
              setFigurineUrl(uploadResponse.data.signed_url);
            } else {
              Alert.alert('Error', uploadResponse.message || 'Failed to generate figurine. Please try again.');
            }
          }
        } catch (error) {
          console.error('Error uploading selfie:', error);
          Alert.alert('Error', 'Failed to generate figurine. Please try again.');
        } finally {
          setIsUploading(false);
          setIsGenerating(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const handleContinue = () => {
    // Check if a figurine is selected
    if (!selectedFigurine) {
      Alert.alert(
        'Figurine Required',
        'Please upload a selfie or select a figurine to personalize your dream before continuing.',
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

  const renderFigurineItem = ({ item, index }: { item: Figurine | { id: string; name: string }; index: number }) => {
    const isFirstItem = index === 0;
    
    if (isFirstItem) {
      // First item is the upload selfie button
      return (
        <TouchableOpacity
          onPress={handleSelfieUpload}
          disabled={isUploading || isGenerating}
          style={[
            styles.imageItem,
            styles.uploadButton,
            (isUploading || isGenerating) && styles.uploadButtonDisabled
          ]}
        >
          {(isUploading || isGenerating) ? (
            <Ionicons name="hourglass-outline" size={24} color={theme.colors.grey[500]} />
          ) : (
            <Ionicons name="camera" size={24} color={theme.colors.grey[900]} />
          )}
          <Text style={[styles.uploadText, (isUploading || isGenerating) && styles.uploadTextDisabled]}>
            {isGenerating ? 'Generating...' : isUploading ? 'Uploading...' : 'Upload Selfie'}
          </Text>
        </TouchableOpacity>
      );
    }
    
    // Render precreated figurine
    const figurine = item as Figurine;
    const isSelected = selectedFigurine === figurine.signed_url;
    
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
          style={styles.image as any}
          contentFit="cover"
          onLoad={() => handleImageLoad(figurine.signed_url)}
          transition={200}
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
          Upload a selfie to create a custom figurine, or choose a precreated one: *
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading figurines...</Text>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'upload', name: 'upload' } as Figurine, ...precreatedFigurines]}
            renderItem={renderFigurineItem}
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
          variant={selectedFigurine ? "black" : "outline"}
          onPress={handleContinue}
          disabled={!selectedFigurine || isGenerating}
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
