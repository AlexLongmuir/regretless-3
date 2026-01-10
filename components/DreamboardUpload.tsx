import React, { useMemo, useState, useEffect } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, Alert, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../contexts/ThemeContext'
import { Theme } from '../utils/theme'
import { analyzeDreamboard, getGeneratedDreams, type GeneratedDreamSuggestion } from '../frontend-services/backend-bridge'
import { supabaseClient } from '../lib/supabaseClient'
import { EmojiListRow } from './EmojiListRow'
import { SheetHeader } from './SheetHeader'
import { Button } from './Button'

// Module-level cache for last dreamboard image and results
let cachedDreamboardImage: string | null = null
let cachedDreamboardResults: GeneratedDreamSuggestion[] | null = null

interface DreamboardUploadProps {
  visible: boolean
  onClose: () => void
  onGenerated: (dreams: GeneratedDreamSuggestion[]) => void
  onSelectTitle?: (title: string) => void
}

type ViewMode = 'home' | 'results' | 'past'

export const DreamboardUpload: React.FC<DreamboardUploadProps> = ({ visible, onClose, onGenerated, onSelectTitle }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<GeneratedDreamSuggestion[]>([])
  const [past, setPast] = useState<GeneratedDreamSuggestion[]>([])
  const [view, setView] = useState<ViewMode>('home')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [previousView, setPreviousView] = useState<ViewMode>('home')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      const hasAuth = !!session?.access_token
      if (!cancelled) setIsAuthenticated(hasAuth)
      
      if (hasAuth) {
        console.log('🔍 Loading past dreamboard searches...')
        const res = await getGeneratedDreams(session.access_token, 'dreamboard')
        console.log('📊 Past dreamboard response:', res)
        if (!cancelled) setPast(res.data.dreams || [])
      } else {
        // No session - expected during onboarding, silently skip past searches
        if (!cancelled) setPast([])
      }
    }
    
    if (visible) {
      // Check if we have cached image and results
      if (cachedDreamboardImage && cachedDreamboardResults && cachedDreamboardResults.length > 0) {
        console.log('✅ Restoring cached dreamboard image and results')
        setImageUri(cachedDreamboardImage)
        setResults(cachedDreamboardResults)
        setView('results')
        setPreviousView('home')
      } else {
        setView('home')
        setResults([])
        setImageUri(null)
      }
      load()
    }
    return () => { cancelled = true }
  }, [visible])

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission required', 'We need access to your photos to upload a dreamboard.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.9 })
    if (!result.canceled && result.assets?.[0]) {
      // Clear cache when user picks a new image (starting fresh)
      cachedDreamboardImage = null
      cachedDreamboardResults = null
      setImageUri(result.assets[0].uri)
      // Reset to home view if we were on results
      if (view === 'results') {
        setView('home')
        setResults([])
      }
    }
  }

  const analyze = async () => {
    if (!imageUri) return
    setPreviousView(view)
    setView('results')
    setAnalyzing(true)
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token
      const file = { uri: imageUri, name: 'dreamboard.jpg', type: 'image/jpeg' }
      const res = await analyzeDreamboard(file, token)
      const ds = res.data.dreams || []
      setResults(ds)
      onGenerated(ds)
      
      // Cache the image and results for next time
      cachedDreamboardImage = imageUri
      cachedDreamboardResults = ds
      console.log('💾 Cached dreamboard image and', ds.length, 'results')
    } catch (e) {
      console.error('Error analyzing dreamboard:', e)
    } finally {
      setAnalyzing(false)
    }
  }

  const pastGroups = useMemo(() => {
    const groups = new Map<string, { label: string; date: string; dreams: GeneratedDreamSuggestion[] }>()
    past.forEach(d => {
      // For dreamboard, use created_at date as grouping key since there's no celebrity name
      const key = d.created_at ? new Date(d.created_at).toDateString() : 'unknown'
      const label = 'Dreamboard'
      const date = new Date(d.created_at || Date.now()).toLocaleDateString()
      const g = groups.get(key) || { label, date, dreams: [] }
      g.dreams.push(d)
      groups.set(key, g)
    })
    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => {
        const ad = a.dreams[0]?.created_at ? new Date(a.dreams[0].created_at).getTime() : 0
        const bd = b.dreams[0]?.created_at ? new Date(b.dreams[0].created_at).getTime() : 0
        return bd - ad
      })
  }, [past])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background.page }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <SheetHeader
          title={view === 'home' ? 'Upload Dreamboard' : view === 'results' ? 'Results' : 'Past searches'}
          onClose={onClose}
          onBack={view !== 'home' ? () => {
            if (view === 'past') {
              setView('home')
            } else {
              setView(previousView)
            }
          } : undefined}
        />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: view === 'home' ? 120 : 100 }}>
          {view === 'home' && (
            <>
              <TouchableOpacity style={styles.upload} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.uploadImage} contentFit="cover" transition={200} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.uploadPlaceholderText}>Tap to choose an image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Button
                title="Analyze Dreams"
                onPress={analyze}
                disabled={!imageUri || analyzing}
                variant="black"
                style={{ marginTop: 16 }}
              />

              {isAuthenticated && (
                <View style={{ marginTop: 16 }}>
                  <EmojiListRow emoji={'🕘'} text={'Past searches'} type="select" onSelect={() => { setPreviousView('home'); setView('past'); }} />
                </View>
              )}
            </>
          )}

          {view === 'results' && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
              {analyzing ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                  <Text style={{ marginTop: 16, color: theme.colors.text.secondary, textAlign: 'center' }}>
                    Analyzing your dreamboard...
                  </Text>
                </View>
              ) : (
                <>
                  {imageUri && (
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <Image 
                        source={{ uri: imageUri }} 
                        style={{ width: 240, height: 240, borderRadius: 30, marginBottom: 12 }}
                        contentFit="cover"
                        transition={200}
                      />
                      <Text style={{ fontSize: 24, fontWeight: '600', color: theme.colors.text.primary }}>Your dreamboard</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 12 }}>
                    Suggested Goals
                  </Text>
                  {results.map((r, idx) => (
                    <EmojiListRow 
                      key={`r-${idx}`} 
                      emoji={r.emoji || '⭐️'} 
                      text={r.title} 
                      type="select" 
                      onSelect={(t) => { 
                        onSelectTitle?.(t); 
                        onClose(); 
                      }} 
                    />
                  ))}
                  <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 12, textAlign: 'left' }}>
                    Select one to get started, don't worry we'll store the other goals for you to access later
                  </Text>
                </>
              )}
            </View>
          )}

          {view === 'past' && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
              {pastGroups.length > 0 ? (
                pastGroups.map(group => (
                  <TouchableOpacity 
                    key={group.id} 
                    onPress={() => { 
                      setPreviousView('past');
                      setResults(group.dreams); 
                      setImageUri(null); // Reset image for past searches
                      setView('results'); 
                    }}
                  >
                    <View style={{ backgroundColor: theme.colors.background.card, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border.default }}>
                      <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '600', color: theme.colors.text.primary }}>{group.label}</Text>
                        <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>{group.date}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text.secondary, textAlign: 'center' }}>
                    No past dreamboard analyses yet.{'\n'}Upload and analyze a dreamboard to see it here!
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  upload: {
    height: 220,
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  uploadImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.disabled.inactive,
  },
  uploadPlaceholderText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
})


