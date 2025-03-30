import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Alert,
  Easing,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { transcribeAudio, transcribeAudioUri } from '../../lib/ai';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Polyfill for Blob.arrayBuffer if it's not available
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function() {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error("FileReader did not return an ArrayBuffer"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read Blob as ArrayBuffer"));
      reader.readAsArrayBuffer(this);
    });
  };
}

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptionComplete,
  isLoading,
  setIsLoading,
}) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animatedValue = useRef(new Animated.Value(1)).current;

  // Pulse animation
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation;
    
    if (isRecording) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.3,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      
      pulseAnimation.start();
    } else {
      animatedValue.setValue(1);
    }
    
    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [isRecording, animatedValue]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      console.log('Requesting audio recording permissions...');
      const permissionResult = await Audio.requestPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.error('Audio recording permission not granted');
        Alert.alert('Permission Required', 'Audio recording permission is required for transcription.');
        return;
      }
      
      console.log('Audio permissions granted, setting audio mode...');
      
      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        // Use numeric values for compatibility
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('Creating audio recording with m4a format...');
      
      // Create recording with explicit m4a format settings
      const { recording } = await Audio.Recording.createAsync({
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4, 
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: Audio.RecordingOptionsPresets.HIGH_QUALITY.web
      });
      
      console.log('Recording started successfully');
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start the timer to track recording duration
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      console.log('Stopping recording...');
      
      // Stop the recording
      await recording.stopAndUnloadAsync();
      
      // Stop the timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      
      // Get the recording URI
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);
      
      console.log('Recording stopped, URI:', uri);
      
      if (uri) {
        processAudioFile(uri);
      } else {
        console.error('No URI returned from recording');
        Alert.alert('Error', 'Failed to get recording file. Please try again.');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      setIsRecording(false);
      setRecording(null);
    }
  };

  const processAudioFile = async (uri: string) => {
    try {
      setIsLoading(true);
      console.log('Processing audio file:', uri);
      
      // Get file info
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        console.log('File info:', JSON.stringify(fileInfo));
      } catch (fileInfoError) {
        console.error('Error getting file info:', fileInfoError);
      }
      
      // Try transcribing directly with URI - this is the most reliable method
      try {
        console.log('Attempting to transcribe directly with URI...');
        const transcription = await transcribeAudioUri(uri);
        
        if (transcription && transcription.trim()) {
          console.log('URI transcription successful:', transcription.substring(0, 50) + '...');
          onTranscriptionComplete(transcription);
          return;
        } else {
          console.warn('URI transcription returned empty result, trying blob method...');
        }
      } catch (uriError) {
        console.error('URI transcription failed:', uriError);
        // Continue to blob method as fallback
      }
      
      // If we get here, URI method failed - try blob approach
      console.log('Reading file as base64 for blob approach...');
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('File read as base64, length:', base64Audio.length);
      
      // Create blob and transcribe
      const audioBlob = base64ToBlob(base64Audio, 'audio/m4a');
      
      // Check if the Blob was created successfully
      if (!audioBlob || audioBlob.size === 0) {
        console.error('Failed to create audio blob from recording');
        throw new Error('Failed to create audio blob from recording');
      }
      
      console.log('Audio blob created successfully, size:', audioBlob.size);
      
      // Transcribe with blob method
      const transcription = await transcribeAudio(audioBlob);
      
      if (transcription && transcription.trim()) {
        console.log('Blob transcription successful:', transcription.substring(0, 50) + '...');
        onTranscriptionComplete(transcription);
      } else {
        console.error('All transcription methods failed');
        Alert.alert('Transcription Error', 'Could not transcribe audio. Please try again or speak more clearly.');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      Alert.alert('Error', `Failed to process audio: ${error.message}`);
    } finally {
      setIsLoading(false);
      
      // We keep the original file until transcription is complete
      // Only then delete it to avoid issues
      try {
        await FileSystem.deleteAsync(uri);
        console.log('Temporary audio file deleted');
      } catch (deleteError) {
        console.error('Failed to delete temporary audio file', deleteError);
      }
    }
  };

  // Helper function to convert base64 to Blob - with error handling
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
      // Make sure we have valid base64 data
      if (!base64 || typeof base64 !== 'string') {
        console.error('Invalid base64 string received');
        throw new Error('Invalid audio data');
      }
      
      // Decode base64
      let byteCharacters;
      try {
        byteCharacters = atob(base64);
      } catch (e) {
        console.error('Failed to decode base64:', e);
        throw new Error('Invalid base64 encoding');
      }
      
      const byteArrays = [];
      
      // Process in chunks to avoid memory issues
      const chunkSize = 512;
      for (let offset = 0; offset < byteCharacters.length; offset += chunkSize) {
        const slice = byteCharacters.slice(offset, offset + chunkSize);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      // Create and return the blob
      return new Blob(byteArrays, { type: mimeType });
    } catch (error) {
      console.error('Error in base64ToBlob:', error);
      // Return a minimal valid blob rather than throwing
      return new Blob([], { type: mimeType });
    }
  };

  // Format seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF2D55" size="small" />
        </View>
      ) : (
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
        >
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                transform: [{ scale: animatedValue }],
              },
            ]}
          >
            <LinearGradient
              colors={isRecording ? ['#FF2D55', '#ED1B79'] : ['#4F5BD5', '#962FBF']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.buttonContent}>
                {isRecording ? (
                  <React.Fragment>
                    <Ionicons name="stop" size={24} color="#fff" />
                    <Text style={styles.durationText}>
                      {formatDuration(recordingDuration)}
                    </Text>
                  </React.Fragment>
                ) : (
                  <Ionicons name="mic" size={24} color="#fff" />
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AudioRecorder; 