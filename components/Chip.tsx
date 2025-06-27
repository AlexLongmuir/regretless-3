import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../utils/theme';

interface ChipProps {
  label: string;
  onPress?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'outlined';
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  onPress,
  onDelete,
  selected = false,
  disabled = false,
  variant = 'default',
  style,
}) => {
  return (
    <Pressable
      style={[
        styles.base,
        styles[variant],
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <Text
        style={[
          styles.text,
          styles[`${variant}Text`],
          selected && styles.selectedText,
          disabled && styles.disabledText,
        ]}
      >
        {label}
      </Text>
      {onDelete && (
        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          disabled={disabled}
          hitSlop={8}
        >
          <Text style={styles.deleteIcon}>×</Text>
        </Pressable>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: theme.colors.grey[100],
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  selected: {
    backgroundColor: theme.colors.primary[500],
  },
  disabled: {
    backgroundColor: theme.colors.grey[100],
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.medium as any,
    lineHeight: theme.typography.lineHeight.subheadline,
  },
  defaultText: {
    color: theme.colors.grey[700],
  },
  outlinedText: {
    color: theme.colors.grey[700],
  },
  selectedText: {
    color: theme.colors.surface[50],
  },
  disabledText: {
    color: theme.colors.grey[400],
  },
  deleteButton: {
    marginLeft: theme.spacing.xs,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[500],
  },
});