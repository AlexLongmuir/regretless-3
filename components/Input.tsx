import React from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../utils/theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  disabled = false,
  secureTextEntry = false,
  multiline = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          disabled && styles.inputDisabled,
          multiline && styles.inputMultiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.grey[400]}
        editable={!disabled}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.medium as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[700],
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    lineHeight: theme.typography.lineHeight.callout,
    color: theme.colors.grey[900],
    backgroundColor: theme.colors.surface[50],
    minHeight: 44,
  },
  inputError: {
    borderColor: theme.colors.error[500],
  },
  inputDisabled: {
    backgroundColor: theme.colors.grey[100],
    color: theme.colors.grey[500],
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.error[500],
    marginTop: theme.spacing.xs,
  },
});