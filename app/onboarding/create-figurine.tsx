/**
 * Create Figurine Step - Onboarding screen for creating user's figurine
 * 
 * This step comes after the name step and allows users to create their character
 * that will be used across all their dreams to show progress.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { OnboardingHeader } from '../../components/onboarding';
import { Button } from '../../components/Button';
import { getPrecreatedFigurines, uploadSelfieForFigurine, type Figurine } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';
import { trackEvent } from '../../lib/mixpanel';

const CreateFigurineStep: React.FC = () => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const navigation = useNavigation();
  const [precreatedFigurines, setPrecreatedFigurines] = useState<Figurine[]>([]);
  const [userGeneratedFigurine, setUserGeneratedFigurine] = useState<Figurine | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedSelfieUri, setUploadedSelfieUri] = useState<string | null>(null);
  const [showDefaults, setShowDefaults] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'create_figurine'
      });
    }, [])
  );

  // Load precreated figurines on component mount
  useEffect(() => {
    const loadPrecreatedFigurines = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const response = await Promise.race([
          getPrecreatedFigurines(session?.access_token),
          timeoutPromise
        ]) as any;
        
        if (response.success && response.data?.figurines) {
          setPrecreatedFigurines(response.data.figurines);
        } else {
          setPrecreatedFigurines([]);
        }
      } catch (error) {
        console.error('Error loading precreated figurines:', error);
        setPrecreatedFigurines([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrecreatedFigurines();
  }, []);

  const handleSelfieUpload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                await processImage(result.assets[0]);
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
                await processImage(result.assets[0]);
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

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsUploading(true);
    setIsGenerating(true);
    setUploadedSelfieUri(asset.uri);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        const file = {
          uri: asset.uri,
          name: asset.fileName || 'selfie.jpg',
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        };

        const uploadResponse = await uploadSelfieForFigurine(file, session.access_token);
        
        if (uploadResponse.success && uploadResponse.data) {
          const generatedFigurine: Figurine = {
            id: uploadResponse.data.id || `generated-${Date.now()}`,
            name: 'Your Custom Figurine',
            signed_url: uploadResponse.data.signed_url,
            path: (uploadResponse.data as any).path || uploadResponse.data.id || ''
          };
          setUserGeneratedFigurine(generatedFigurine);
          
          // Haptic feedback when figurine is complete
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Smooth animation transition from uploaded image to generated figurine
          Animated.sequence([
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: true,
              }),
            ]),
          ]).start();
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
  };

  const handleFigurineSelect = (figurineUrl: string) => {
    // Save to profile
    const saveToProfile = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { error } = await supabaseClient
            .from('profiles')
            .update({ figurine_url: figurineUrl })
            .eq('user_id', user.id);
          
          if (error) {
            console.error('Error saving figurine to profile:', error);
          }
        }
      } catch (error) {
        console.error('Error saving figurine to profile:', error);
      }
    };
    saveToProfile();
  };

  const handleContinue = async () => {
    if (!userGeneratedFigurine) {
      Alert.alert(
        'Figurine Required',
        'Please upload a photo of yourself or select a default character to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Ensure figurine is saved to profile before continuing
    await handleFigurineSelect(userGeneratedFigurine.signed_url);

    navigation.navigate('Understanding' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderDefaultFigurine = ({ item }: { item: Figurine }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          handleFigurineSelect(item.signed_url);
          setUserGeneratedFigurine(item);
        }}
        style={styles.defaultFigurineItem}
      >
        <Image
          source={{ uri: item.signed_url }}
          style={styles.defaultFigurineImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    );
  };

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
        <OnboardingHeader 
          onBack={handleBack}
          showProgress={true}
        />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Build your character</Text>
            <Text style={styles.subtitle}>
              Upload a selfie and see yourself progress as you work towards your dreams
            </Text>
          </View>

          {/* Generated Figurine or Upload Button */}
          {userGeneratedFigurine ? (
            <>
              <Animated.View
                style={[
                  styles.figurineContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  }
                ]}
              >
                <Image
                  source={{ uri: userGeneratedFigurine.signed_url }}
                  style={styles.figurineImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </Animated.View>
              
              {/* Upload Button - Always visible under figurine */}
              <TouchableOpacity
                onPress={handleSelfieUpload}
                style={styles.uploadButton}
              >
                <View style={styles.uploadButtonContent}>
                  <Ionicons name="camera-outline" size={20} color={isDark ? theme.colors.text.primary : '#F9FAFB'} />
                  <Text style={styles.uploadText}>
                    Upload or Take Photo of Yourself
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          ) : isGenerating && uploadedSelfieUri ? (
            <Animated.View 
              style={[
                styles.figurineContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                }
              ]}
            >
              <Image
                source={{ uri: uploadedSelfieUri }}
                style={styles.figurineImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.generatingOverlay}>
                <Text style={styles.generatingText}>Generating figurine...</Text>
              </View>
            </Animated.View>
          ) : (
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
                  <Ionicons name="hourglass-outline" size={20} color={isDark ? theme.colors.text.secondary : '#D1D5DB'} />
                  <Text style={[styles.uploadText, styles.uploadTextDisabled]}>
                    {isGenerating ? 'Generating...' : 'Uploading...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.uploadButtonContent}>
                  <Ionicons name="camera-outline" size={20} color={isDark ? theme.colors.text.primary : '#F9FAFB'} />
                  <Text style={styles.uploadText}>
                    Upload or Take Photo of Yourself
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Default Characters Section - Collapsible */}
          {(precreatedFigurines.length > 0 || userGeneratedFigurine) && (
            <View style={styles.defaultsSection}>
              <TouchableOpacity
                onPress={() => setShowDefaults(!showDefaults)}
                style={styles.defaultsHeader}
              >
                <Text style={styles.defaultsHeaderText}>Or choose a default character</Text>
                <Ionicons 
                  name={showDefaults ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={isDark ? theme.colors.text.secondary : '#D1D5DB'} 
                />
              </TouchableOpacity>
              
              {showDefaults && (
                <FlatList
                  data={[
                    ...(userGeneratedFigurine ? [userGeneratedFigurine] : []),
                    ...precreatedFigurines
                  ]}
                  renderItem={renderDefaultFigurine}
                  keyExtractor={(item, index) => item.id || `default-${index}`}
                  numColumns={3}
                  columnWrapperStyle={styles.defaultsGridRow}
                  scrollEnabled={false}
                />
              )}
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
          variant={userGeneratedFigurine ? "secondary" : "outline"}
          onPress={handleContinue}
          disabled={!userGeneratedFigurine || isGenerating}
          style={[styles.button, userGeneratedFigurine && styles.lightButton]}
        />
      </View>
    </View>
  );
};

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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['4xl'],
      flexGrow: 1,
    },
    titleSection: {
      marginBottom: theme.spacing.xl,
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
    },
    figurineContainer: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.background.card,
      marginBottom: theme.spacing.lg,
    },
    figurineImage: {
      width: '100%',
      height: '100%',
    },
    uploadButton: {
      width: '100%',
      height: 56,
      backgroundColor: isDark ? theme.colors.background.card : 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
      marginBottom: theme.spacing.lg,
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
      color: isDark ? theme.colors.text.primary : '#F9FAFB',
      fontWeight: '500',
    },
    uploadTextDisabled: {
      color: isDark ? theme.colors.text.tertiary : '#9CA3AF',
    },
    generatingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    generatingText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.system,
    },
    defaultsSection: {
      marginTop: theme.spacing.lg,
    },
    defaultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    defaultsHeaderText: {
      fontSize: 14,
      color: isDark ? theme.colors.text.secondary : '#D1D5DB',
    },
    defaultsGridRow: {
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    spacingArea: {
      height: theme.spacing['4xl'],
    },
    defaultFigurineItem: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.background.card,
      marginHorizontal: 4,
    },
    defaultFigurineImage: {
      width: '100%',
      height: '100%',
    },
    footer: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      backgroundColor: isDark ? theme.colors.background.page : '#1A1A1A',
      zIndex: 2,
    },
    button: {
      width: '100%',
      borderRadius: theme.radius.xl,
    },
    lightButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 0,
    },
  });
};

export default CreateFigurineStep;
