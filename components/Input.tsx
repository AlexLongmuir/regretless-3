import React, { useState, forwardRef, useEffect, useRef } from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextStyle, Platform, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../utils/theme';
import { IconButton } from './IconButton';
import { audioRecorder, AudioRecording } from '../lib/audioRecorder';
import { transcribeAudio } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';

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
  variant?: 'default' | 'borderless';
  onDateChange?: (date: Date) => void;
  showDatePicker?: boolean;
  onToggleDatePicker?: () => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  minimumDate?: Date;
  initialDate?: Date;
  showMicButton?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
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
  variant = 'default',
  onDateChange,
  showDatePicker = false,
  onToggleDatePicker,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  minimumDate,
  initialDate,
  showMicButton = false,
}, ref) => {
  const [internalDate, setInternalDate] = useState<Date>(() => initialDate || new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelHistory = useRef<number[]>([]); // Store last 30 seconds of audio levels
  const waveformAnimations = useRef<Animated.Value[]>([]).current;
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize waveform animations - more bars for fuller look
  useEffect(() => {
    if (showMicButton && waveformAnimations.length === 0) {
      for (let i = 0; i < 40; i++) {
        waveformAnimations.push(new Animated.Value(0.15));
      }
    }
  }, [showMicButton]);

  // Update waveform based on real audio levels with rolling history
  useEffect(() => {
    if (isRecording && waveformAnimations.length > 0) {
      // Add current audio level to history
      audioLevelHistory.current.push(audioLevel);
      
      // Keep only last 30 seconds (600 samples at 50ms intervals)
      const maxHistoryLength = 600;
      if (audioLevelHistory.current.length > maxHistoryLength) {
        audioLevelHistory.current.shift();
      }
      
      // Map history to waveform bars
      const historyLength = audioLevelHistory.current.length;
      const barsPerSecond = waveformAnimations.length / 30; // 40 bars / 30 seconds
      
      waveformAnimations.forEach((anim, index) => {
        // Calculate which part of history this bar represents
        const historyIndex = Math.floor((index / waveformAnimations.length) * historyLength);
        const level = historyIndex < historyLength ? audioLevelHistory.current[historyIndex] : 0;
        
        // More exaggerated response like ChatGPT
        const amplifiedLevel = Math.pow(level, 0.5);
        const baseHeight = 0.15 + (amplifiedLevel * 0.85);
        
        // Add slight randomness for natural feel
        const randomOffset = (Math.random() - 0.5) * 0.3;
        const targetHeight = Math.max(0.15, Math.min(1, baseHeight + randomOffset));
        
        Animated.timing(anim, {
          toValue: targetHeight,
          duration: 50,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [audioLevel, isRecording, waveformAnimations]);
  
  // Update internal date when value changes
  React.useEffect(() => {
    if (value && type === 'date') {
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime())) {
        setInternalDate(dateValue);
      }
    }
  }, [value, type]);
  
  // Update internal date when initialDate changes
  React.useEffect(() => {
    if (initialDate) {
      setInternalDate(initialDate);
    }
  }, [initialDate]);
  
  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setInternalDate(selectedDate);
      if (onDateChange) {
        onDateChange(selectedDate);
      }
    }
  };

  const startRecording = async () => {
    try {
      const hasPermission = await audioRecorder.checkPermissions();
      if (!hasPermission) {
        const granted = await audioRecorder.requestPermissions();
        if (!granted) {
          return;
        }
      }

      // Clear previous history
      audioLevelHistory.current = [];

      // Set up audio level callback for real-time visualization
      audioRecorder.setAudioLevelCallback((level: number) => {
        setAudioLevel(level);
      });

      await audioRecorder.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioLevel(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('[Input] Failed to start recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setIsTranscribing(true);
      const audioFile: AudioRecording = await audioRecorder.stopRecording();

      // Get auth token if available (optional - allows transcription during onboarding)
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      const result = await transcribeAudio(audioFile, token);

      if (result.success && result.data?.text) {
        // Append transcribed text to existing value
        const newText = value ? `${value} ${result.data.text}` : result.data.text;
        onChangeText(newText);
      }
    } catch (error) {
      console.error('[Input] Transcription failed:', error);
    } finally {
      setIsRecording(false);
      setIsTranscribing(false);
      setRecordingDuration(0);
      setAudioLevel(0);
      audioLevelHistory.current = [];
      audioRecorder.setAudioLevelCallback(() => {});
    }
  };

  const toggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCancel = async () => {
    try {
      await audioRecorder.cancelRecording();
    } catch {}
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingDuration(0);
    setAudioLevel(0);
    audioLevelHistory.current = [];
    audioRecorder.setAudioLevelCallback(() => {});
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, size === 'small' && styles.smallContainer, style]}>
      {label && <Text style={[styles.label, size === 'small' && styles.smallLabel]}>{label}</Text>}
      {type === 'date' && onToggleDatePicker ? (
        <TouchableOpacity
          style={[
            styles.inputContainer,
            size === 'small' && styles.smallInputContainer,
            variant === 'borderless' && styles.borderlessInputContainer,
            error && styles.inputContainerError,
            disabled && styles.inputContainerDisabled,
          ]}
          onPress={onToggleDatePicker}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <TextInput
            ref={ref}
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
            editable={false}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
          />
          <IconButton
            icon="calendar"
            size="sm"
            variant="ghost"
            onPress={onToggleDatePicker}
            style={styles.calendarButton}
          />
        </TouchableOpacity>
      ) : (
        <View style={[
          styles.inputContainer,
          size === 'small' && styles.smallInputContainer,
          variant === 'borderless' && styles.borderlessInputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}>
          {/* Waveform overlay when recording */}
           {isRecording && (
             <>
               <View style={styles.waveformContainer}>
                 <View style={styles.waveform}>
                   {waveformAnimations.map((anim, index) => (
                     <Animated.View
                       key={index}
                       style={[
                         styles.waveformBar,
                         {
                           height: anim.interpolate({
                             inputRange: [0, 1],
                             outputRange: [6, 16],
                           }),
                         },
                       ]}
                     />
                   ))}
                 </View>
                 <Text style={styles.recordingTimer}>{formatDuration(recordingDuration)}</Text>
               </View>
             </>
           )}
          
          <TextInput
            ref={ref}
            style={[
              styles.input,
              size === 'small' && styles.smallInput,
              type === 'date' && styles.dateInput,
              multiline && styles.inputMultiline,
              isRecording && styles.inputHidden,
              isTranscribing && styles.inputTranscribing,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={isRecording ? 'transparent' : theme.colors.grey[400]}
            editable={!disabled && type !== 'date' && !isTranscribing && !isRecording}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
          />

          {/* Controls: mic when idle; X + ✓ when recording or transcribing */}
          {showMicButton && !(isRecording || isTranscribing) && (
            <TouchableOpacity
              onPress={startRecording}
              disabled={disabled}
              style={styles.micButton}
              activeOpacity={0.7}
            >
              <MaterialIcon name="mic" size={18} color={theme.colors.grey[700]} />
            </TouchableOpacity>
          )}

          {showMicButton && (isRecording || isTranscribing) && (
            <>
              <TouchableOpacity
                onPress={isTranscribing ? undefined : handleCancel}
                disabled={isTranscribing}
                style={[styles.controlButton, styles.controlLeft]}
                activeOpacity={0.7}
              >
                <MaterialIcon name="close" size={18} color={theme.colors.grey[700]} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={isTranscribing ? undefined : () => stopRecording()}
                disabled={isTranscribing}
                style={[styles.controlButton, styles.controlRight, isTranscribing && styles.controlDisabled]}
                activeOpacity={0.7}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={theme.colors.grey[700]} />
                ) : (
                  <MaterialIcon name="check" size={18} color={theme.colors.grey[700]} />
                )}
              </TouchableOpacity>
            </>
          )}
          
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
      )}
      {error && <Text style={[styles.error, size === 'small' && styles.smallError]}>{error}</Text>}
      {type === 'date' && showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={internalDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          themeVariant="light"
        />
      )}
    </View>
  );
});

Input.displayName = 'Input';

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
  borderlessInputContainer: {
    borderWidth: 0,
    backgroundColor: 'white',
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
  inputHidden: {
    color: 'transparent',
  },
  inputTranscribing: {
    opacity: 0.6,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.grey[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
  },
  micButtonActive: {
    backgroundColor: theme.colors.grey[800],
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.grey[200],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '50%',
    marginTop: -18,
  },
  controlLeft: {
    left: 4,
  },
  controlRight: {
    right: 4,
  },
  controlDisabled: {
    opacity: 0.7,
  },
  waveformContainer: {
    position: 'absolute',
    left: 44, // Start after X button
    right: 44, // End before tick button
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    height: 20,
  },
  waveformBar: {
    width: 2,
    backgroundColor: theme.colors.grey[600],
    borderRadius: 1,
    marginHorizontal: 0.5,
  },
  recordingTimer: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[700],
    minWidth: 40,
    textAlign: 'right',
  },
  transcribingIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.grey[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.xs,
  },
});