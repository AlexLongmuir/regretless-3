import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../utils/theme';
import { Icon } from './Icon';

interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  onDone?: () => void;
  doneDisabled?: boolean;
  doneLoading?: boolean;
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

// Reusable glass button wrapper
const GlassButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onPress, disabled, children }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} style={styles.glassButtonWrapper}>
    <BlurView intensity={100} tint="light" style={styles.glassButton}>
      {children}
    </BlurView>
  </TouchableOpacity>
);

export const SheetHeader: React.FC<SheetHeaderProps> = ({
  title,
  onClose,
  onBack,
  onDone,
  doneDisabled = false,
  doneLoading = false,
}) => {
  return (
    <View style={styles.header}>
      {/* Left button: X (close) or Back chevron */}
      {onBack ? (
        <GlassButton onPress={onBack}>
          <View style={{ marginLeft: -1 }}>
            <Icon name="chevron_left_rounded" size={42} color={theme.colors.grey[900]} />
          </View>
        </GlassButton>
      ) : (
        <GlassButton onPress={onClose}>
          <RoundedXIcon size={38} color={theme.colors.grey[900]} />
        </GlassButton>
      )}

      {/* Center title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Right button: Done/Check or empty space */}
      {onDone ? (
        <GlassButton onPress={onDone} disabled={doneDisabled || doneLoading}>
          {doneLoading ? (
            <ActivityIndicator size="small" color={theme.colors.grey[900]} />
          ) : (
            <Icon name="check" size={24} color={doneDisabled ? theme.colors.grey[400] : theme.colors.grey[900]} />
          )}
        </GlassButton>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: theme.colors.pageBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey[200],
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
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
    color: theme.colors.grey[900],
  },
});

