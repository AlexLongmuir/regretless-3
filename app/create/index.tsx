import React, { useEffect, useState, useRef, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { useToast } from '../../components/toast/ToastProvider'
import { Input } from '../../components/Input'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { EmojiListRow } from '../../components'
import { DreamInputActions } from '../../components/DreamInputActions'
import { CelebritySelector, preloadCelebrities, preloadCelebrityDreams } from '../../components/CelebritySelector'
import { DreamboardUpload } from '../../components/DreamboardUpload'
import { upsertDream, getDefaultImages } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { trackEvent } from '../../lib/mixpanel'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'

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
  const { theme, isDark } = useTheme()
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark])
  const { title, dreamId, start_date, end_date, image_url, setField, preloadedDefaultImages, setPreloadedDefaultImages } = useCreateDream()
  const navigation = useNavigation<any>()
  const toast = useToast()
  const scrollViewRef = useRef<ScrollView>(null)
  const [showCelebs, setShowCelebs] = useState(false)
  const [showDreamboard, setShowDreamboard] = useState(false)
  const [personalized, setPersonalized] = useState<{ title: string; emoji?: string }[]>([])
  
  // Track start of create flow
  useEffect(() => {
    trackEvent('create_dream_start')
  }, [])

  // Preload celebrities and dreams when component mounts
  useEffect(() => {
    const preload = async () => {
      try {
        await preloadCelebrities()
        // Preload dreams (will skip if no auth - handled internally)
        await preloadCelebrityDreams().catch(e => {
          // Silently fail - dreams will be fetched when needed
        });
      } catch (e) {
        console.log('Failed to preload celebrities:', e);
      }
    };
    preload();
  }, []);
  
  // Preload images on mount if not already loaded
  useEffect(() => {
    if (preloadedDefaultImages !== null && preloadedDefaultImages !== undefined) {
      // Already preloaded, skip
      return
    }

    const preloadImages = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (!session?.access_token) {
          return
        }

        const response = await getDefaultImages(session.access_token)
        
        if (response && response.success && response.data && Array.isArray(response.data.images) && response.data.images.length > 0) {
          // Prefetch all images in parallel
          await Promise.all(
            response.data.images.map((image: any) => {
              if (image && image.signed_url) {
                return Image.prefetch(image.signed_url).catch(() => {
                  // Silently fail individual prefetches
                })
              }
              return Promise.resolve()
            })
          )
          
          // Store in context
          setPreloadedDefaultImages(response.data.images)
        }
      } catch (error) {
        // Silently fail - image selection page will fetch on demand
        console.error('Failed to preload images:', error)
      }
    }

    preloadImages()
  }, [preloadedDefaultImages, setPreloadedDefaultImages])
  
  const handlePresetSelect = (text: string) => {
    trackEvent('create_dream_preset_selected', { preset_text: text })
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

    // Check if user has a figurine
    let hasFigurine = false;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('figurine_url')
          .eq('user_id', user.id)
          .single();
        
        hasFigurine = !!profile?.figurine_url;
      }
    } catch (error) {
      console.error('Error checking for figurine:', error);
    }

    // Navigate immediately for smooth UX
    if (hasFigurine) {
      navigation.navigate('PersonalizeBaseline')
    } else {
      navigation.navigate('CreateFigurine')
    }
    
    trackEvent('create_dream_title_entered', {
      length: title.length,
      has_preset: dreamPresets.some(p => p.text === title),
      source: dreamPresets.some(p => p.text === title) ? 'preset' : 'manual'
    })

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

  const handleGenerated = (dreams: { title: string; emoji?: string }[]) => {
    setPersonalized(prev => {
      const map = new Map<string, { title: string; emoji?: string }>()
      ;[...prev, ...dreams].forEach(d => map.set(d.title, d))
      return Array.from(map.values())
    })
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100)
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CreateScreenHeader step="title" />
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            What's the dream you want to achieve?
          </Text>
        
        <Input 
          placeholder="Start writing..." 
          value={title}
          onChangeText={(t) => setField('title', t)}
          variant="borderless"
          multiline={true}
          style={styles.input}
        />

        <DreamInputActions
          title="Need inspiration?"
          onOpenCelebrities={() => {
            trackEvent('create_dream_inspiration_opened', { type: 'celebrity' })
            setShowCelebs(true)
          }}
          onOpenDreamboard={() => {
            trackEvent('create_dream_inspiration_opened', { type: 'dreamboard' })
            setShowDreamboard(true)
          }}
        />

        {/* Personalized suggestions now live inside the bottom sheets (not on base page) */}

        <Text style={styles.optionsLabel}>
          Frequently chosen goals
        </Text>

        <View style={styles.optionsContainer}>
          {dreamPresets.map((preset, index) => (
            <EmojiListRow
              key={index}
              emoji={preset.emoji}
              text={preset.text}
              type="select"
              onSelect={handlePresetSelect}
              isSelected={title === preset.text}
            />
          ))}
        </View>
        
          {/* Add spacing area before button */}
          <View style={styles.spacingArea} />
        </ScrollView>
        
        {/* Footer with button */}
        <View style={styles.footer}>
          <Button 
            title="Continue"
            variant="inverse"
            onPress={handleContinue}
            style={styles.button}
          />
        </View>
      </SafeAreaView>

      <CelebritySelector visible={showCelebs} onClose={() => setShowCelebs(false)} onGenerated={handleGenerated} onSelectTitle={(t) => handlePresetSelect(t)} />
      <DreamboardUpload visible={showDreamboard} onClose={() => setShowDreamboard(false)} onGenerated={handleGenerated} onSelectTitle={(t) => handlePresetSelect(t)} />
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? theme.colors.text.primary : theme.colors.text.inverse,
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
  },
  input: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  optionsLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: isDark ? theme.colors.text.secondary : theme.colors.text.inverse,
    opacity: isDark ? 1 : 0.8,
    marginBottom: theme.spacing.md,
  },
  optionsContainer: {
    gap: theme.spacing.sm,
  },
  spacingArea: {
    height: theme.spacing['4xl'],
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
})
