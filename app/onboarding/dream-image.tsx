/**
 * Dream Image Step - Onboarding screen for selecting dream image
 * 
 * Uses the user's existing figurine to generate a dream-specific image,
 * or allows users to upload their own image
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { OnboardingHeader } from '../../components/onboarding';
import { Button } from '../../components/Button';
import { generateDreamImage } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';
import { theme } from '../../utils/theme';
import { trackEvent } from '../../lib/mixpanel';

const DreamImageStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setDreamImageUrl } = useOnboardingContext();
  const [userFigurineUrl, setUserFigurineUrl] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(state.dreamImageUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'dream_image'
      });
    }, [])
  );

  // Load user's figurine from profile
  useEffect(() => {
    const loadUserFigurine = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('figurine_url')
            .eq('user_id', user.id)
            .single();

          if (!error && profile?.figurine_url) {
            setUserFigurineUrl(profile.figurine_url);
          }
        }
      } catch (error) {
        console.error('Error loading user figurine:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFigurine();
  }, []);

  const handleImageUpload = async () => {
    try {
      Alert.alert(
        'Add Photo',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraPermission.granted === false) {
                Alert.alert('Permission Required', 'Permission to access camera is required!');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setUploadedImageUri(result.assets[0].uri);
                setSelectedImageUrl(result.assets[0].uri);
              }
            }
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (libraryPermission.granted === false) {
                Alert.alert('Permission Required', 'Permission to access photo library is required!');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setUploadedImageUri(result.assets[0].uri);
                setSelectedImageUrl(result.assets[0].uri);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const handleGenerateFromFigurine = async () => {
    if (!userFigurineUrl) {
      Alert.alert('Error', 'No figurine found. Please upload an image instead.');
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token && state.answers) {
        // Get dream title from answers (question ID 2 stores the main dream)
        const dreamTitle = state.answers[2] || 'My Dream';
        const dreamContext = Object.values(state.answers).join(' ');

        // For onboarding, we might not have a dream ID yet, so we'll need to handle that
        // For now, we'll generate the image and store it in context
        const response = await generateDreamImage(
          userFigurineUrl,
          dreamTitle,
          dreamContext,
          'temp-dream-id', // Temporary ID for onboarding
          session.access_token
        );

        if (response.success && response.data) {
          setSelectedImageUrl(response.data.signed_url);
          setDreamImageUrl(response.data.signed_url);
        } else {
          Alert.alert('Error', 'Failed to generate dream image. Please try uploading an image instead.');
        }
      }
    } catch (error) {
      console.error('Error generating dream image:', error);
      Alert.alert('Error', 'Failed to generate dream image. Please try uploading an image instead.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = () => {
    if (!selectedImageUrl) {
      Alert.alert(
        'Image Required',
        'Please generate an image from your figurine or upload your own image to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    setDreamImageUrl(selectedImageUrl);
    navigation.navigate('TimeCommitment' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
                    <Ionicons name="hourglass-outline" size={20} color={theme.colors.grey[500]} />
                    <Text style={[styles.buttonText, styles.buttonTextDisabled]}>
                      Generating...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="sparkles-outline" size={20} color={theme.colors.grey[900]} />
                    <Text style={styles.buttonText}>
                      Generate from your character
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Or Divider */}
            {userFigurineUrl && (
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {/* Upload Image Button */}
            <TouchableOpacity
              onPress={handleImageUpload}
              style={styles.uploadButton}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="image-outline" size={20} color={theme.colors.grey[900]} />
                <Text style={styles.buttonText}>
                  Upload your own image
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
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
  contentArea: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    marginBottom: theme.spacing.lg,
  },
  dreamImage: {
    width: '100%',
    height: '100%',
  },
  generateButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.surface[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    marginBottom: theme.spacing.md,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  uploadButton: {
    width: '100%',
    height: 56,
    backgroundColor: theme.colors.surface[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: theme.colors.grey[200],
    borderStyle: 'dashed',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    color: theme.colors.grey[900],
    fontWeight: '500',
  },
  buttonTextDisabled: {
    color: theme.colors.grey[500],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.grey[200],
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.grey[500],
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
