import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface AudioRecording {
  uri: string;
  duration: number;
  name: string;
  type: string;
  size: number;
}

export class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private levelPollInterval: NodeJS.Timeout | null = null;

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[AudioRecorder] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[AudioRecorder] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Set callback for real-time audio level updates
   */
  setAudioLevelCallback(callback: (level: number) => void) {
    this.audioLevelCallback = callback;
  }

  /**
   * Start polling audio levels
   */
  private startAudioLevelPolling() {
    if (this.levelPollInterval) return;

    this.levelPollInterval = setInterval(async () => {
      if (this.recording && this.audioLevelCallback) {
        try {
          const status = await this.recording.getStatusAsync();
          // Normalize meter to 0-1 range (meter is typically -160 to 0 dB)
          const normalizedLevel = status.metering ? Math.max(0, (status.metering + 60) / 60) : 0;
          this.audioLevelCallback(normalizedLevel);
        } catch (error) {
          // Ignore errors during level polling
        }
      }
    }, 50); // Poll every 50ms for smooth visualization
  }

  /**
   * Stop polling audio levels
   */
  private stopAudioLevelPolling() {
    if (this.levelPollInterval) {
      clearInterval(this.levelPollInterval);
      this.levelPollInterval = null;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create and prepare recording using Expo preset for cross-platform safety
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status: any) => {
          // Recording status updates (can be used for progress tracking)
          if (status.isDoneRecording) {
            console.log('[AudioRecorder] Recording finished');
          }
        },
        100 // Update interval in ms
      );

      this.recording = recording;
      this.isRecording = true;
      this.startAudioLevelPolling();
      console.log('[AudioRecorder] Recording started');
    } catch (error) {
      console.error('[AudioRecorder] Failed to start recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  /**
   * Stop recording and get the audio file
   */
  async stopRecording(): Promise<AudioRecording> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      
      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync();

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Get file info
      const fileName = `recording_${Date.now()}.m4a`;
      const mimeType = Platform.OS === 'ios' ? 'audio/x-m4a' : 'audio/mp4';

      // Estimate file size (rough approximation)
      // Average bitrate: 128kbps = 16KB/s
      const durationMs = status.durationMillis || 0;
      const estimatedSize = Math.round((durationMs / 1000) * 16000);

      const audioRecording: AudioRecording = {
        uri,
        duration: durationMs,
        name: fileName,
        type: mimeType,
        size: estimatedSize,
      };

      // Clean up
      this.stopAudioLevelPolling();
      this.recording = null;
      this.isRecording = false;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      console.log('[AudioRecorder] Recording stopped:', audioRecording);
      return audioRecording;
    } catch (error) {
      console.error('[AudioRecorder] Failed to stop recording:', error);
      this.stopAudioLevelPolling();
      this.recording = null;
      this.isRecording = false;
      throw new Error('Failed to stop recording');
    }
  }

  /**
   * Cancel current recording without saving
   */
  async cancelRecording(): Promise<void> {
    if (!this.recording) {
      return;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      this.stopAudioLevelPolling();
      this.recording = null;
      this.isRecording = false;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      console.log('[AudioRecorder] Recording cancelled');
    } catch (error) {
      console.error('[AudioRecorder] Failed to cancel recording:', error);
      this.stopAudioLevelPolling();
      this.recording = null;
      this.isRecording = false;
    }
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get current recording status
   */
  async getStatus() {
    if (!this.recording) {
      return null;
    }

    try {
      return await this.recording.getStatusAsync();
    } catch (error) {
      console.error('[AudioRecorder] Failed to get status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const audioRecorder = new AudioRecorderService();

