import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../utils/theme';
import { IconButton } from './IconButton';

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
  size?: 'default' | 'small';
  type?: 'text' | 'date' | 'singleline';
  onDateChange?: (date: Date) => void;
  showDatePicker?: boolean;
  onToggleDatePicker?: () => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
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
  size = 'default',
  type = 'text',
  onDateChange,
  showDatePicker = false,
  onToggleDatePicker,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}) => {
  const [internalDate, setInternalDate] = useState<Date>(new Date());
  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setInternalDate(selectedDate);
      if (onDateChange) {
        onDateChange(selectedDate);
      }
    }
  };

  return (
    <View style={[styles.container, size === 'small' && styles.smallContainer, style]}>
      {label && <Text style={[styles.label, size === 'small' && styles.smallLabel]}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        size === 'small' && styles.smallInputContainer,
        error && styles.inputContainerError,
        disabled && styles.inputContainerDisabled,
      ]}>
        <TextInput
          style={[
            styles.input,
            size === 'small' && styles.smallInput,
            type === 'date' && styles.dateInput,
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.grey[400]}
          editable={!disabled && type !== 'date'}
          secureTextEntry={secureTextEntry}
          multiline={type === 'singleline' ? true : multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {type === 'date' && onToggleDatePicker && (
          <IconButton
            icon="calendar"
            size="sm"
            variant="ghost"
            onPress={onToggleDatePicker}
            style={styles.calendarButton}
          />
        )}
      </View>
      {error && <Text style={[styles.error, size === 'small' && styles.smallError]}>{error}</Text>}
      {type === 'date' && showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={internalDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  smallContainer: {
    marginBottom: 0,
  },
  label: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.medium as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[700],
    marginBottom: theme.spacing.xs,
  },
  smallLabel: {
    fontSize: theme.typography.fontSize.caption1,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface[50],
    minHeight: 44,
  },
  smallInputContainer: {
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  inputContainerError: {
    borderColor: theme.colors.error[500],
  },
  inputContainerDisabled: {
    backgroundColor: theme.colors.grey[100],
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    lineHeight: theme.typography.lineHeight.callout,
    color: theme.colors.grey[900],
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  smallInput: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 11,
    fontSize: 16,
    lineHeight: 18,
    textAlignVertical: 'center',
  },
  dateInput: {
    paddingRight: theme.spacing.xs,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  calendarButton: {
    marginRight: theme.spacing.xs,
  },
  error: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.error[500],
    marginTop: theme.spacing.xs,
  },
  smallError: {
    fontSize: 12,
    marginTop: 4,
  },
});