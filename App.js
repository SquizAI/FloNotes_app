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
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { extractTasksFromText } from './lib/ai';
import { verifyApiKeys, checkEnvironmentVariables } from './lib/env-check';
import NotesScreen from './src/screens/NotesScreen';

// Create a bottom tab navigator
const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [envStatus, setEnvStatus] = useState(null);
  
  useEffect(() => {
    // Check if API keys are valid (not just placeholders)
    const checkApiKeys = async () => {
      try {
        // First check if environment variables are loaded correctly
        const status = checkEnvironmentVariables();
        setEnvStatus(status);
        
        if (!status.allValid) {
          setError("API key error. One or more API keys are missing or invalid.");
          setIsLoading(false);
          return;
        }
        
        // Attempt a small request to test API connection
        const testResult = await extractTasksFromText("Test connection");
        if (testResult) {
          console.log("API connection successful");
        }
        setIsLoading(false);
      } catch (error) {
        console.error("API initialization error:", error);
        setError("API connection error. Please check your .env file and network connection.");
        setIsLoading(false);
      }
    };
    
    checkApiKeys();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F5BD5" />
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
            Please check that your API keys are correctly set in the .env file.
          </Text>
          {envStatus && (
            <View style={styles.keyStatus}>
              <Text style={styles.keyStatusTitle}>API Key Status:</Text>
              <Text style={[
                styles.keyStatusItem, 
                envStatus.isOpenAIKeyValid ? styles.keyValid : styles.keyInvalid
              ]}>
                OpenAI: {envStatus.isOpenAIKeyValid ? envStatus.openaiKeyMasked : 'Invalid'}
              </Text>
              <Text style={[
                styles.keyStatusItem, 
                envStatus.isGoogleKeyValid ? styles.keyValid : styles.keyInvalid
              ]}>
                Google AI: {envStatus.isGoogleKeyValid ? envStatus.googleKeyMasked : 'Invalid'}
              </Text>
              <Text style={[
                styles.keyStatusItem, 
                envStatus.isDeepgramKeyValid ? styles.keyValid : styles.keyInvalid
              ]}>
                Deepgram: {envStatus.isDeepgramKeyValid ? envStatus.deepgramKeyMasked : 'Invalid'}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Notes') {
              iconName = focused ? 'document-text' : 'document-text-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4F5BD5',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Notes" component={NotesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4F5BD5',
  },
  header: {
    padding: 16,
    backgroundColor: '#4F5BD5',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF5252',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    marginBottom: 16,
  },
  keyStatus: {
    marginTop: 16,
    width: '100%',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  keyStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#424242',
  },
  keyStatusItem: {
    fontSize: 14,
    marginBottom: 6,
    paddingVertical: 4,
  },
  keyValid: {
    color: '#4CAF50',
  },
  keyInvalid: {
    color: '#FF5252',
  }
}); 