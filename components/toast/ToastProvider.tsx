// components/toast/ToastProvider.tsx
import React, { createContext, useContext, useState, useCallback } from 'react'
import { View, Text, Animated, Easing, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type Toast = { id: number; title: string; description?: string }
type Ctx = { show: (title: string, description?: string) => void }
const ToastCtx = createContext<Ctx | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<Toast[]>([])
  const [opacity] = useState(new Animated.Value(0))

  const show = useCallback((title: string, description?: string) => {
    const id = Date.now()
    setQueue(q => [...q, { id, title, description }])
    Animated.timing(opacity, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() =>
          setQueue(q => q.filter(t => t.id !== id))
        )
      }, 1600)
    })
  }, [])

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {queue.length > 0 && (
        <SafeAreaView pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.wrap, { opacity }]}>
            <View style={styles.toast}>
              <Text style={styles.title}>{queue[queue.length - 1].title}</Text>
              {!!queue[queue.length - 1].description && (
                <Text style={styles.desc}>{queue[queue.length - 1].description}</Text>
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
      )}
    </ToastCtx.Provider>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 12 },
  toast: { backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, maxWidth: '90%' },
  title: { color: 'white', fontWeight: '600' },
  desc: { color: '#ddd', marginTop: 2 }
})
