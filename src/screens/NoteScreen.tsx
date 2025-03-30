import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  AudioRecorder, 
  ContentTypeDetector 
} from '../components';
import { 
  extractTasksFromText, 
  categorizeTasksAndSuggestNotes, 
  extractGroceryList,
  enhanceTranscribedText 
} from '../../lib/ai';

const NoteScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState('New Note');
  const [processingType, setProcessingType] = useState<'tasks' | 'grocery' | 'enhance' | null>(null);

  // Process text based on selected mode
  const processText = async () => {
    if (!input.trim()) {
      Alert.alert('Error', 'Please enter some text or record an audio note');
      return;
    }

    setIsLoading(true);
    
    try {
      let processedResult;
      
      switch (processingType) {
        case 'tasks':
          processedResult = await extractTasksFromText(input);
          break;
        case 'grocery':
          processedResult = await extractGroceryList(input);
          break;
        case 'enhance':
          processedResult = await enhanceTranscribedText(input);
          break;
        default:
          // By default, categorize and organize tasks
          processedResult = await categorizeTasksAndSuggestNotes(input);
      }
      
      setResult(processedResult);
    } catch (error) {
      console.error('Error processing text:', error);
      Alert.alert('Error', 'Failed to process your note. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle audio transcription completion
  const handleTranscriptionComplete = (transcription: string) => {
    setInput(transcription);
    // You could auto-process here if desired
    // processText();
  };

  // Toggle task completion in the task list
  const handleToggleTask = (index: number) => {
    if (result && result.tasks && Array.isArray(result.tasks)) {
      const updatedTasks = [...result.tasks];
      updatedTasks[index] = {
        ...updatedTasks[index],
        done: !updatedTasks[index].done
      };
      
      setResult({
        ...result,
        tasks: updatedTasks
      });
    }
  };

  // Toggle grocery item completion
  const handleToggleGroceryItem = (category: string, index: number) => {
    if (result && 
        result.categories && 
        result.categories[category] && 
        Array.isArray(result.categories[category])) {
      
      const updatedCategories = { ...result.categories };
      updatedCategories[category][index] = {
        ...updatedCategories[category][index],
        done: !updatedCategories[category][index].done
      };
      
      setResult({
        ...result,
        categories: updatedCategories
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.header}>
          <TextInput
            style={styles.titleInput}
            value={noteTitle}
            onChangeText={setNoteTitle}
            placeholder="Note Title"
            placeholderTextColor="#999"
          />
          <View style={styles.modeButtons}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                processingType === 'tasks' && styles.selectedMode
              ]}
              onPress={() => setProcessingType('tasks')}
            >
              <Ionicons 
                name="checkbox-outline" 
                size={20} 
                color={processingType === 'tasks' ? '#fff' : '#555'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                processingType === 'grocery' && styles.selectedMode
              ]}
              onPress={() => setProcessingType('grocery')}
            >
              <Ionicons 
                name="cart-outline" 
                size={20} 
                color={processingType === 'grocery' ? '#fff' : '#555'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                processingType === 'enhance' && styles.selectedMode
              ]}
              onPress={() => setProcessingType('enhance')}
            >
              <Ionicons 
                name="sparkles-outline" 
                size={20} 
                color={processingType === 'enhance' ? '#fff' : '#555'} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Enter your note or task list here..."
            placeholderTextColor="#aaa"
            multiline
            textAlignVertical="top"
          />
          
          <View style={styles.actionsContainer}>
            <AudioRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
            
            <TouchableOpacity
              style={[styles.processButton, !input.trim() && styles.disabledButton]}
              onPress={processText}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="flash-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.resultContainer}>
          {result ? (
            <ContentTypeDetector 
              content={result}
              title={noteTitle}
              onToggleTask={handleToggleTask}
              onToggleGroceryItem={handleToggleGroceryItem}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.placeholderText}>
                {input.trim() 
                  ? 'Click the lightning bolt to process your note' 
                  : 'Enter text or record audio to get started'}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    padding: 8,
  },
  modeButtons: {
    flexDirection: 'row',
  },
  modeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedMode: {
    backgroundColor: '#4F5BD5',
  },
  inputContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 150,
    maxHeight: 300,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  processButton: {
    backgroundColor: '#4F5BD5',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default NoteScreen; 