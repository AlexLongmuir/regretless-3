import React, { useMemo } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { Theme } from '../utils/theme'

interface DreamInputActionsProps {
  onOpenCelebrities: () => void
  onOpenDreamboard: () => void
  title?: string
}

export const DreamInputActions: React.FC<DreamInputActionsProps> = ({
  onOpenCelebrities,
  onOpenDreamboard,
  title,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.left]} onPress={onOpenCelebrities} activeOpacity={0.8}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.label}>Generate celeb-inspired goals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.right]} onPress={onOpenDreamboard} activeOpacity={0.8}>
          <Text style={styles.emoji}>📸</Text>
          <Text style={styles.label}>Upload your dreamboard for ideas</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: isDark ? theme.colors.text.secondary : theme.colors.text.inverse,
    opacity: isDark ? 1 : 0.8,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  button: {
    width: '100%',
    minHeight: 48,
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    paddingHorizontal: theme.spacing.md,
  },
  left: {},
  right: {},
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    color: theme.colors.text.primary,
    textAlign: 'left',
    flexShrink: 1,
    fontFamily: theme.typography.fontFamily.system,
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
})
