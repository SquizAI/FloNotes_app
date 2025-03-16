import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { extractTasksFromText } from './lib/ai';
import NotesScreen from './src/screens/NotesScreen';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Check if API keys are valid (not just placeholders)
    const checkApiKeys = async () => {
      try {
        // Attempt a small request to test API connection
        const testResult = await extractTasksFromText("Test connection");
        if (testResult) {
          console.log("API connection successful");
        }
        setIsLoading(false);
      } catch (error) {
        console.error("API initialization error:", error);
        setError("API key error. Please check your OpenAI API key in the .env file.");
        setIsLoading(false);
      }
    };
    
    checkApiKeys();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3F51B5" />
        <Text style={styles.loadingText}>Initializing AI services...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Notes</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>
            Please check that your OpenAI API key is correctly set in the .env file.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <NotesScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3F51B5',
  },
  header: {
    padding: 16,
    backgroundColor: '#3F51B5',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5252',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5252',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  }
}); 