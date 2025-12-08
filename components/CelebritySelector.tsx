import React, { useEffect, useMemo, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, FlatList, Image, TextInput, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { theme } from '../utils/theme'
import { getDefaultCelebrities, generateCelebrityDreams, getGeneratedDreams, type CelebrityProfile, type GeneratedDreamSuggestion } from '../frontend-services/backend-bridge'
import { supabaseClient } from '../lib/supabaseClient'
import { EmojiListRow } from './EmojiListRow'
import { Button } from './Button'
import { SheetHeader } from './SheetHeader'

// Default image for custom celebrity names
const DEFAULT_CUSTOM_CELEBRITY_IMAGE = require('../assets/images/onboarding/20250916_0842_Swirling Abstract Energy_simple_compose_01k58qjb1ae89sraq48r9636ze.png')

// Simple in-memory cache for preloaded celebrities
let preloadedCelebrities: CelebrityProfile[] | null = null
let preloadedDreams: Map<string, GeneratedDreamSuggestion[]> = new Map() // Key: celebrity name (lowercase)
let preloadPromise: Promise<void> | null = null
let dreamsPreloadPromise: Promise<void> | null = null

// Preload celebrities - call this when parent page mounts
export const preloadCelebrities = async (): Promise<void> => {
  // If already preloaded, return immediately
  if (preloadedCelebrities) {
    return
  }
  
  // If already preloading, wait for that promise
  if (preloadPromise) {
    await preloadPromise
    return
  }
  
  // Start preloading celebrities
  preloadPromise = (async () => {
    try {
      console.log('🔍 Preloading celebrities...')
      const res = await getDefaultCelebrities()
      const celebrities = res.data.celebrities || []
      preloadedCelebrities = celebrities
      console.log('✅ Celebrities preloaded:', celebrities.length)
      
      // Preload images for celebrities (both local default and remote celebrity images)
      console.log('🖼️ Preloading celebrity images...')
      const defaultCelebrityImageUrl = 'https://cqzutvspbsspgtmcdqyp.supabase.co/storage/v1/object/public/celebrity-images/default-celebrity.png'
      const imagePreloadPromises = [
        // Preload default custom celebrity image (local)
        (async () => {
          try {
            const resolvedSource = Image.resolveAssetSource(DEFAULT_CUSTOM_CELEBRITY_IMAGE)
            if (resolvedSource?.uri) {
              // Prefetch local image
              await Image.prefetch(resolvedSource.uri).catch(() => {
                // getSize might fail for local images, that's okay
              })
            }
          } catch (e) {
            // Silently fail
          }
        })(),
        // Prefetch default celebrity image (remote)
        Image.prefetch(defaultCelebrityImageUrl).catch(() => {
          // Silently fail
        }),
        // Prefetch all preset celebrity images (remote)
        ...celebrities.map(async (celebrity) => {
          try {
            if (celebrity.signed_url) {
              await Image.prefetch(celebrity.signed_url).catch(() => {
                // Silently fail individual prefetches
              })
            }
          } catch (e) {
            // Silently fail
          }
        })
      ]
      await Promise.allSettled(imagePreloadPromises)
      console.log('✅ Preloaded celebrity images')
      
      // Prefetch dreams for each preset celebrity
      // This will fetch existing dreams from the database (or generate if needed)
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token
      
      console.log('🔍 Prefetching dreams for preset celebrities...')
      const dreamPromises = celebrities.map(async (celebrity) => {
        try {
          const celebNameLower = celebrity.name.toLowerCase().trim()
          // Call generate endpoint which checks database first
          // If dreams exist, they'll be returned; if not, they'll be generated
          const dreamsRes = await generateCelebrityDreams(celebrity.name, token)
          const dreams = dreamsRes.data.dreams || []
          
          if (dreams.length > 0) {
            // Store in cache
            preloadedDreams.set(celebNameLower, dreams)
            console.log(`✅ Prefetched ${dreams.length} dreams for ${celebrity.name}`)
          }
        } catch (e) {
          // Silently fail for individual celebrities - non-fatal
          console.log(`⚠️ Could not prefetch dreams for ${celebrity.name}:`, e)
        }
      })
      
      await Promise.allSettled(dreamPromises)
      console.log('✅ Finished prefetching dreams for preset celebrities')
    } catch (e) {
      console.log('⚠️ Error preloading celebrities:', e)
      preloadPromise = null // Reset on error so we can retry
      throw e
    }
  })()
  
  await preloadPromise
}

// Preload generated dreams separately - call this when parent page mounts (after auth is ready)
export const preloadCelebrityDreams = async (): Promise<void> => {
  // If already preloading dreams, wait for that promise
  if (dreamsPreloadPromise) {
    await dreamsPreloadPromise
    return
  }
  
  // Start preloading dreams
  dreamsPreloadPromise = (async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (session?.access_token) {
        console.log('🔍 Preloading celebrity generated dreams...')
        const dreamsRes = await getGeneratedDreams(session.access_token, 'celebrity')
        const dreams = dreamsRes.data.dreams || []
        
        // Clear and repopulate the map (normalize celebrity names)
        preloadedDreams.clear()
        dreams.forEach(dream => {
          const celebName = dream.source_data?.celebrity_name?.toLowerCase()?.trim()
          if (celebName) {
            if (!preloadedDreams.has(celebName)) {
              preloadedDreams.set(celebName, [])
            }
            preloadedDreams.get(celebName)!.push(dream)
          }
        })
        
        console.log('✅ Preloaded dreams for', preloadedDreams.size, 'celebrities')
      } else {
        console.log('ℹ️ No session token, skipping generated dreams preload')
      }
    } catch (e) {
      console.log('⚠️ Error preloading generated dreams (non-fatal):', e)
      dreamsPreloadPromise = null // Reset on error so we can retry
    }
  })()
  
  await dreamsPreloadPromise
}

interface CelebritySelectorProps {
  visible: boolean
  onClose: () => void
  onGenerated?: (dreams: GeneratedDreamSuggestion[]) => void
  onSelectTitle?: (title: string) => void
}

type ViewMode = 'home' | 'results' | 'past'

export const CelebritySelector: React.FC<CelebritySelectorProps> = ({ visible, onClose, onGenerated, onSelectTitle }) => {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [items, setItems] = useState<CelebrityProfile[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeneratedDreamSuggestion[]>([])
  const [past, setPast] = useState<GeneratedDreamSuggestion[]>([])
  const [view, setView] = useState<ViewMode>('home')
  const [previousView, setPreviousView] = useState<ViewMode>('home')
  const [resultsHeader, setResultsHeader] = useState<string>('Generated results')
  const [selectedCelebrity, setSelectedCelebrity] = useState<CelebrityProfile | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Preload default custom celebrity image and default celebrity image on mount
  useEffect(() => {
    const preloadDefaultImages = async () => {
      try {
        // Preload local default custom celebrity image
        const resolvedSource = Image.resolveAssetSource(DEFAULT_CUSTOM_CELEBRITY_IMAGE)
        if (resolvedSource?.uri) {
          await Image.prefetch(resolvedSource.uri).catch(() => {
            // Silently fail
          })
        }
        // Preload default celebrity image URL
        const defaultCelebrityImageUrl = 'https://cqzutvspbsspgtmcdqyp.supabase.co/storage/v1/object/public/celebrity-images/default-celebrity.png'
        await Image.prefetch(defaultCelebrityImageUrl).catch(() => {
          // Silently fail
        })
      } catch (e) {
        // Silently fail - images will load when needed
      }
    }
    preloadDefaultImages()
  }, [])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    const load = async () => {
      // Check authentication status
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!cancelled) setIsAuthenticated(!!session?.access_token)
      
      // Check for preloaded data first
      if (preloadedCelebrities) {
        console.log('✅ Using preloaded celebrities')
        setItems(preloadedCelebrities)
        setLoading(false)
      } else {
        setLoading(true)
        try {
          console.log('🔍 Loading default celebrities...')
          const res = await getDefaultCelebrities()
          console.log('📊 Celebrities response:', res)
          const celebrities = res.data.celebrities || []
          if (!cancelled) {
            setItems(celebrities)
            // Update preloaded cache for next time
            preloadedCelebrities = celebrities
            
            // Prefetch celebrity images in the background
            celebrities.forEach(async (celebrity) => {
              try {
                if (celebrity.signed_url) {
                  await Image.prefetch(celebrity.signed_url).catch(() => {
                    // Silently fail
                  })
                }
              } catch (e) {
                // Silently fail
              }
            })
          }
        } catch (e) {
          console.error('❌ Error loading celebrities:', e)
          if (!cancelled) setItems([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      }
      
      // Load past searches (only if authenticated)
      // Use preloaded dreams if available, otherwise fetch
      try {
        if (session?.access_token) {
          if (preloadedDreams.size > 0) {
            // Use preloaded dreams for past searches
            const allDreams = Array.from(preloadedDreams.values()).flat()
            if (!cancelled) setPast(allDreams)
            console.log('✅ Using preloaded dreams for past searches:', allDreams.length)
          } else {
            // Fallback: fetch from API
            console.log('🔍 Loading past celebrity searches from API...')
            const pastRes = await getGeneratedDreams(session.access_token, 'celebrity')
            console.log('📊 Past searches response:', pastRes)
            const dreams = pastRes.data.dreams || []
            if (!cancelled) setPast(dreams)
            
            // Update preloaded cache (normalize celebrity names)
            dreams.forEach(dream => {
              const celebName = dream.source_data?.celebrity_name?.toLowerCase()?.trim()
              if (celebName) {
                if (!preloadedDreams.has(celebName)) {
                  preloadedDreams.set(celebName, [])
                }
                preloadedDreams.get(celebName)!.push(dream)
              }
            })
          }
        } else {
          // No session - expected during onboarding, silently skip past searches
          if (!cancelled) setPast([])
        }
      } catch (e) {
        console.log('⚠️ Error loading past searches:', e)
        if (!cancelled) setPast([])
      }
    }
    setView('home')
    setResults([])
    setResultsHeader('Generated results')
    load()
    return () => { cancelled = true }
  }, [visible])

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0)
      return
    }

    const showSubscription = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0)
    })

    // Android uses different event names
    const showSubscriptionAndroid = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hideSubscriptionAndroid = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0)
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
      showSubscriptionAndroid.remove()
      hideSubscriptionAndroid.remove()
    }
  }, [visible])

  const handleGenerate = async (name: string, celebrity?: CelebrityProfile) => {
    // Store current view as previous view
    setPreviousView(view)
    // Set selectedCelebrity - if no celebrity provided, create a custom one with the name
    setSelectedCelebrity(celebrity || {
      id: 'custom',
      name: name,
      signed_url: undefined,
      description: undefined,
      category: undefined,
      image_url: undefined
    } as CelebrityProfile)
    
    // Normalize celebrity name to lowercase for consistent lookups
    const normalizedName = name.toLowerCase().trim()
    console.log('🎯 Generating dreams for celebrity (normalized):', normalizedName, '(original:', name, ')')
    
    // FIRST: Check preloaded cache (works for both authenticated and onboarding)
    // This is instant and doesn't require any network calls
    console.log('🔍 Step 1: Checking preloaded cache for:', normalizedName)
    const preloadedForCelebrity = preloadedDreams.get(normalizedName)
    if (preloadedForCelebrity && preloadedForCelebrity.length > 0) {
      console.log('✅ Found in preloaded cache:', preloadedForCelebrity.length, 'dreams')
      // Instant navigation to results view with cached data
      setView('results')
      setResults(preloadedForCelebrity)
      setResultsHeader(`Results for "${name}"`)
      onGenerated?.(preloadedForCelebrity)
      return // No loading state needed!
    }
    console.log('📭 Not found in preloaded cache')
    
    // If not in cache, we need to fetch/generate - show loading state
    setView('results')
    setGenerating(true)
    
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token
      
      // If authenticated, check database first
      if (token) {
        
        // If not in cache, check database
        console.log('🔍 Step 2: Checking database for existing dreams for:', normalizedName)
        try {
          const existingRes = await getGeneratedDreams(token, 'celebrity')
          const existingDreams = existingRes.data.dreams || []
          console.log('📊 Retrieved', existingDreams.length, 'total dreams from database')
          
          const existingForCelebrity = existingDreams.filter(d => {
            const celebName = d.source_data?.celebrity_name?.toLowerCase()?.trim()
            return celebName === normalizedName
          })
          
          if (existingForCelebrity.length > 0) {
            console.log('✅ Found existing dreams in database:', existingForCelebrity.length, 'dreams for', normalizedName)
            // Update preloaded cache for next time
            preloadedDreams.set(normalizedName, existingForCelebrity)
            console.log('💾 Updated preloaded cache with', existingForCelebrity.length, 'dreams')
            setResults(existingForCelebrity)
            setResultsHeader(`Results for "${name}"`)
            onGenerated?.(existingForCelebrity)
            setGenerating(false)
            return
          }
          
          console.log('📭 No existing dreams found in database for:', normalizedName)
        } catch (e) {
          console.error('⚠️ Error checking database, will generate new:', e)
        }
        
        // Only generate if not found in database
        console.log('🆕 Step 3: Generating new dreams for:', normalizedName)
        const res = await generateCelebrityDreams(name, token)
        const ds = res.data.dreams || []
        console.log('✅ Generated', ds.length, 'new dreams')
        setResults(ds)
        setResultsHeader(`Results for "${name}"`)
        onGenerated?.(ds)
        
        // Update preloaded cache with new dreams
        if (ds.length > 0) {
          preloadedDreams.set(normalizedName, ds)
          console.log('💾 Stored', ds.length, 'dreams in preloaded cache for:', normalizedName)
        }
        setGenerating(false)
        return
      }
      
      // If not authenticated (onboarding), generate without saving
      // Note: Backend will check database first using service role
      console.log('🆕 Step 2: Generating dreams for onboarding (no auth):', normalizedName)
      const res = await generateCelebrityDreams(name)
      const ds = res.data.dreams || []
      console.log('✅ Generated', ds.length, 'dreams for onboarding')
      setResults(ds)
      setResultsHeader(`Results for "${name}"`)
      onGenerated?.(ds)
      
      // Update preloaded cache with new dreams (even during onboarding)
      if (ds.length > 0) {
        preloadedDreams.set(normalizedName, ds)
        console.log('💾 Stored', ds.length, 'dreams in preloaded cache for:', normalizedName)
      }
      setGenerating(false)
    } catch (e) {
      console.error('❌ Error generating dreams:', e)
      setGenerating(false)
    }
  }

  const renderItem = ({ item }: { item: CelebrityProfile }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleGenerate(item.name, item)}>
      {item.signed_url ? (
        <Image 
          source={{ uri: item.signed_url }} 
          style={styles.image}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => {
            // Image failed to load, but we'll keep the card structure
            console.log('Failed to load image for:', item.name);
          }}
        />
      ) : (
        <Image 
          source={{ uri: 'https://cqzutvspbsspgtmcdqyp.supabase.co/storage/v1/object/public/celebrity-images/default-celebrity.png' }} 
          style={styles.image}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => {
            // Fallback to placeholder if default image fails
            console.log('Failed to load default image for:', item.name);
          }}
        />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  )

  const pastGroups = useMemo(() => {
    console.log('🔄 Processing past groups, past data:', past)
    const groups = new Map<string, { label: string; date: string; dreams: GeneratedDreamSuggestion[] }>()
    past.forEach(d => {
      // Use celebrity_name from source_data as the grouping key
      const key = d.source_data?.celebrity_name || 'unknown'
      const label = d.source_data?.celebrity_name || 'Celebrity search'
      const date = new Date(d.created_at || Date.now()).toLocaleDateString()
      const g = groups.get(key) || { label, date, dreams: [] as GeneratedDreamSuggestion[] }
      g.dreams.push(d)
      groups.set(key, g)
    })
    // most recent first by first item's created_at
    const result = Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => {
        const ad = a.dreams[0]?.created_at ? new Date(a.dreams[0].created_at).getTime() : 0
        const bd = b.dreams[0]?.created_at ? new Date(b.dreams[0].created_at).getTime() : 0
        return bd - ad
      })
    console.log('📋 Past groups result:', result)
    return result
  }, [past])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
        {/* Header */}
        <SheetHeader
          title={view === 'home' ? 'Celebrity Dreams' : view === 'results' ? 'Results' : 'Past searches'}
          onClose={onClose}
          onBack={view !== 'home' ? () => {
            if (view === 'past') {
              setView('home')
            } else {
              setView(previousView)
            }
          } : undefined}
        />

        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: view === 'home' ? 120 : 100 }}>
            {loading && view === 'home' ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, color: theme.colors.grey[600] }}>Loading celebrities...</Text>
              </View>
            ) : null}

            {view === 'home' && !loading && (
              <>
                {isAuthenticated && (
                  <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                    <EmojiListRow emoji={'🕘'} text={'Past searches'} type="select" onSelect={() => { 
                      setPreviousView('home'); 
                      setView('past'); 
                    }} />
                  </View>
                )}
                {items.length > 0 ? (
                  <FlatList
                    data={items}
                    keyExtractor={(it, idx) => it.id || String(idx)}
                    renderItem={renderItem}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
                  />
                ) : (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.grey[600], textAlign: 'center' }}>
                      No celebrities found.{'\n'}Check the console for debugging info.
                    </Text>
                  </View>
                )}
              </>
            )}

            {view === 'results' && (
              <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
                {generating ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                    <Text style={{ marginTop: 16, color: theme.colors.grey[600], textAlign: 'center' }}>
                      Generating dreams for {selectedCelebrity?.name || query}...
                    </Text>
                  </View>
                ) : (
                  <>
                    {selectedCelebrity && (
                      <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        {/* Show image - use default custom image if no signed_url, otherwise use the celebrity's image */}
                        {selectedCelebrity.id === 'custom' || !selectedCelebrity.signed_url ? (
                          // Custom celebrity - use default image
                          <Image 
                            source={DEFAULT_CUSTOM_CELEBRITY_IMAGE} 
                            style={{ width: 240, height: 240, borderRadius: 30, marginBottom: 12 }}
                            resizeMode="cover"
                            fadeDuration={0}
                          />
                        ) : selectedCelebrity.signed_url && selectedCelebrity.signed_url !== 'placeholder' ? (
                          // Preset celebrity with valid image URL
                          <Image 
                            source={{ uri: selectedCelebrity.signed_url }} 
                            style={{ width: 240, height: 240, borderRadius: 30, marginBottom: 12 }}
                            resizeMode="cover"
                            fadeDuration={0}
                            onError={() => {
                              // If image fails to load, set to placeholder to show default
                              setSelectedCelebrity(prev => prev ? { ...prev, signed_url: 'placeholder' } : null);
                            }}
                          />
                        ) : selectedCelebrity.signed_url === 'error' ? (
                          // Error state - show placeholder
                          <View style={{ 
                            width: 240, 
                            height: 240, 
                            borderRadius: 30, 
                            backgroundColor: theme.colors.grey[200], 
                            marginBottom: 12,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Text style={{ fontSize: 48, color: theme.colors.grey[400] }}>⭐</Text>
                          </View>
                        ) : (
                          // Fallback to default celebrity image
                          <Image 
                            source={{ uri: 'https://cqzutvspbsspgtmcdqyp.supabase.co/storage/v1/object/public/celebrity-images/default-celebrity.png' }} 
                            style={{ width: 240, height: 240, borderRadius: 30, marginBottom: 12 }}
                            resizeMode="cover"
                            fadeDuration={0}
                            onError={() => {
                              // Fallback to star emoji if default image fails
                              setSelectedCelebrity(prev => prev ? { ...prev, signed_url: 'error' } : null);
                            }}
                          />
                        )}
                        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.colors.grey[900] }}>{selectedCelebrity.name}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.grey[900], marginBottom: 12 }}>
                      Suggested Goals
                    </Text>
                    {results.map((r, idx) => (
                      <EmojiListRow key={`r-${idx}`} emoji={r.emoji || '⭐️'} text={r.title} type="select" onSelect={(t) => { onSelectTitle?.(t); onClose(); }} />
                    ))}
                    <Text style={{ fontSize: 12, color: theme.colors.grey[600], marginTop: 12, textAlign: 'left' }}>
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
                        setResultsHeader(`${group.label} • ${group.date}`); 
                        setSelectedCelebrity({ 
                          id: group.id, 
                          name: group.label, 
                          signed_url: undefined, 
                          description: undefined 
                        } as CelebrityProfile);
                        setView('results'); 
                      }}
                    >
                      <View style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.grey[200] }}>
                        <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontWeight: '600', color: '#000' }}>{group.label}</Text>
                          <Text style={{ color: theme.colors.grey[600], fontSize: 12 }}>{group.date}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.grey[600], textAlign: 'center' }}>
                      No past searches yet.{'\n'}Generate some celebrity dreams to see them here!
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Text input at bottom */}
          {view === 'home' && (
            <View style={[
              styles.inputContainer, 
              { 
                paddingBottom: Math.max(insets.bottom, 16) + 16,
                position: 'absolute',
                bottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0,
                left: 0,
                right: 0
              }
            ]}>
              <TextInput
                placeholder="Type a celebrity name..."
                placeholderTextColor={theme.colors.grey[400]}
                value={query}
                onChangeText={setQuery}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Button
                title="Generate from name"
                onPress={() => query.trim() && handleGenerate(query.trim())}
                disabled={!query.trim() || generating}
                variant="black"
                style={{ marginTop: 12 }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.grey[200]
  },
  card: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.grey[200]
  },
  image: { width: '100%', aspectRatio: 1 },
  cardContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12
  },
  name: { 
    fontWeight: '600', 
    color: '#000',
    fontSize: 14,
    marginBottom: 4
  },
  description: {
    fontSize: 12,
    color: theme.colors.grey[600],
    lineHeight: 16
  },
  inputContainer: {
    padding: 16,
    backgroundColor: theme.colors.pageBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
  },
  placeholderImage: {
    backgroundColor: theme.colors.grey[200],
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderText: {
    fontSize: 24,
    color: theme.colors.grey[400]
  }
})


