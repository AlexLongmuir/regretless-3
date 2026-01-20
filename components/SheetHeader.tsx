import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { Icon } from './Icon';

interface SheetHeaderProps {
  title?: string;
  onClose: () => void;
  onBack?: () => void;
  onDone?: () => void;
  doneDisabled?: boolean;
  doneLoading?: boolean;
  titleColor?: string;
}

// Custom rounded X icon component - 50% thinner stroke, 25% bigger
export const RoundedXIcon = ({ size, color }: { size: number; color: string }) => {
  const strokeWidth = size * 0.075; // 50% thinner than original (was 0.15)
  const radius = size * 0.2;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size * 0.7,
        height: strokeWidth,
        backgroundColor: color,
        borderRadius: radius,
        transform: [{ rotate: '45deg' }],
        position: 'absolute',
      }} />
      <View style={{
        width: size * 0.7,
        height: strokeWidth,
        backgroundColor: color,
        borderRadius: radius,
        transform: [{ rotate: '-45deg' }],
        position: 'absolute',
      }} />
    </View>
  );
};

export const SheetHeader: React.FC<SheetHeaderProps> = ({
  title,
  onClose,
  onBack,
  onDone,
  doneDisabled = false,
  doneLoading = false,
  titleColor,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Reusable glass button wrapper - moved inside component to access styles and isDark
  const GlassButton: React.FC<{
    onPress: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }> = ({ onPress, disabled, children }) => {
    // In dark mode, completely remove BlurView and use solid View to eliminate fuzzy edges
    if (isDark) {
      return (
        <TouchableOpacity onPress={onPress} disabled={disabled} style={styles.glassButtonWrapper}>
          <View 
            style={[
              styles.glassButton,
              { backgroundColor: theme.colors.background.card },
            ]}
          >
            {children}
          </View>
        </TouchableOpacity>
      );
    }
    
    // In light mode, use BlurView for glass effect
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} style={styles.glassButtonWrapper}>
        <BlurView 
          intensity={100} 
          tint="light" 
          style={styles.glassButton}
        >
          {children}
        </BlurView>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.header}>
      {/* Left button: X (close) or Back chevron */}
      {onBack ? (
        <GlassButton onPress={onBack}>
          <View style={{ marginLeft: -1 }}>
            <Icon name="chevron_left_rounded" size={42} color={theme.colors.text.primary} />
          </View>
        </GlassButton>
      ) : (
        <GlassButton onPress={onClose}>
          <RoundedXIcon size={38} color={theme.colors.text.primary} />
        </GlassButton>
      )}

      {/* Center title */}
      {title && (
        <View style={styles.titleContainer}>
          <Text style={[styles.title, titleColor && { color: titleColor }]}>{title}</Text>
        </View>
      )}
      {!title && <View style={{ flex: 1 }} />}

      {/* Right button: Done/Check or empty space */}
      {onDone ? (
        <GlassButton onPress={onDone} disabled={doneDisabled || doneLoading}>
          {doneLoading ? (
            <ActivityIndicator size="small" color={theme.colors.text.primary} />
          ) : (
            <Icon name="check" size={24} color={doneDisabled ? theme.colors.disabled.inactive : theme.colors.text.primary} />
          )}
        </GlassButton>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent', // Transparent to show background images behind
    borderBottomWidth: 0, // Remove border when transparent
    borderBottomColor: 'transparent',
  },
  glassButtonWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background.card + 'F0', // ~95% opacity (only used in light mode)
    borderWidth: 0.5,
    borderColor: theme.colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
});

