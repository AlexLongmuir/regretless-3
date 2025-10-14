import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, Alert } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../utils/theme';
import { audioRecorder, AudioRecording } from '../lib/audioRecorder';
import { transcribeAudio } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';

interface AudioInputProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

type AudioState = 'idle' | 'recording' | 'transcribing' | 'error';

export const AudioInput: React.FC<AudioInputProps> = ({
  onTranscriptionComplete,
  onError,
  disabled = false,
  placeholder = 'Tap to speak',
}) => {
  const [state, setState] = useState<AudioState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnimRef = useRef(new Animated.Value(1)).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // Cancel any ongoing recording
      if (audioRecorder.isCurrentlyRecording()) {
        audioRecorder.cancelRecording();
      }
    };
  }, []);

  // Pulse animation for recording state
  useEffect(() => {
    if (state === 'recording') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimRef, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimRef, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [state]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      // Check permissions
      const hasPermission = await audioRecorder.checkPermissions();
      if (!hasPermission) {
        const granted = await audioRecorder.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Microphone Permission Required',
            'Please enable microphone access in your device settings to use voice input.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Start recording
      await audioRecorder.startRecording();
      setState('recording');
      setRecordingDuration(0);
      setErrorMessage('');

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('[AudioInput] Failed to start recording:', error);
      setState('error');
      setErrorMessage('Failed to start recording. Please try again.');
      if (onError) {
        onError('Failed to start recording');
      }
    }
  };

  const stopRecording = async () => {
    try {
      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setState('transcribing');

      // Stop recording and get audio file
      const audioFile: AudioRecording = await audioRecorder.stopRecording();

      console.log('[AudioInput] Recording stopped, transcribing...', audioFile);

      // Get auth token
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Transcribe audio
      const result = await transcribeAudio(audioFile, session.access_token);

      if (result.success && result.data?.text) {
        console.log('[AudioInput] Transcription successful:', result.data.text);
        onTranscriptionComplete(result.data.text);
        setState('idle');
        setRecordingDuration(0);
      } else {
        throw new Error(result.error || 'Failed to transcribe audio');
      }
    } catch (error) {
      console.error('[AudioInput] Transcription failed:', error);
      setState('error');
      setErrorMessage('Failed to transcribe audio. Please try again.');
      if (onError) {
        onError('Failed to transcribe audio');
      }
    }
  };

  const cancelRecording = async () => {
    try {
      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      await audioRecorder.cancelRecording();
      setState('idle');
      setRecordingDuration(0);
      setErrorMessage('');
    } catch (error) {
      console.error('[AudioInput] Failed to cancel recording:', error);
    }
  };

  const retry = () => {
    setState('idle');
    setErrorMessage('');
    setRecordingDuration(0);
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <TouchableOpacity
            style={[styles.button, styles.recordButton]}
            onPress={startRecording}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <MaterialIcon name="mic" size={48} color="white" />
            <Text style={styles.buttonText}>{placeholder}</Text>
          </TouchableOpacity>
        );

      case 'recording':
        return (
          <View style={styles.recordingContainer}>
            <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: pulseAnimRef }] }]}>
              <MaterialIcon name="mic" size={48} color={theme.colors.error[500]} />
            </Animated.View>
            <Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
            <Text style={styles.recordingSubtext}>Recording...</Text>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopRecording}
              activeOpacity={0.7}
            >
              <MaterialIcon name="stop" size={24} color="white" />
              <Text style={styles.buttonText}>Stop & Transcribe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={cancelRecording}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      case 'transcribing':
        return (
          <View style={styles.transcribingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={styles.transcribingText}>Transcribing...</Text>
            <Text style={styles.transcribingSubtext}>This may take a few seconds</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.errorContainer}>
            <MaterialIcon name="error-outline" size={48} color={theme.colors.error[500]} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.button, styles.retryButton]}
              onPress={retry}
              activeOpacity={0.7}
            >
              <MaterialIcon name="refresh" size={24} color="white" />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  recordButton: {
    backgroundColor: theme.colors.primary[500],
    minWidth: 200,
  },
  stopButton: {
    backgroundColor: theme.colors.error[500],
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    marginTop: theme.spacing.sm,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    marginTop: theme.spacing.lg,
  },
  buttonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  cancelButtonText: {
    color: theme.colors.grey[600],
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  recordingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  recordingIndicator: {
    marginBottom: theme.spacing.md,
  },
  recordingText: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  recordingSubtext: {
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.lg,
  },
  transcribingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  transcribingText: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginTop: theme.spacing.md,
  },
  transcribingSubtext: {
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[600],
    marginTop: theme.spacing.xs,
  },
  errorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    fontSize: theme.typography.fontSize.callout,
    color: theme.colors.error[500],
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
});





