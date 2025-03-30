import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import NoteScreen from './src/screens/NoteScreen';
import GroceryScreen from './src/screens/GroceryScreen';

// Create custom theme
const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4F5BD5',
    background: '#121214',
    card: '#1E1E24',
    text: '#FFFFFF',
    border: '#2A2A36',
    notification: '#FF2D55',
  },
};

// Fix the Tab Navigator by using createBottomTabNavigator with correct typing
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar style="light" />
      <NavigationContainer theme={DarkTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Notes') {
                iconName = focused ? 'document-text' : 'document-text-outline';
              } else if (route.name === 'Grocery') {
                iconName = focused ? 'cart' : 'cart-outline';
              }

              return <Ionicons name={iconName as any} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#FF2D55',
            tabBarInactiveTintColor: '#6D6D8A',
            headerShown: true,
            tabBarStyle: styles.tabBar,
            headerStyle: styles.header,
            headerTitleStyle: styles.headerTitle,
            headerTintColor: '#FFFFFF',
          })}
        >
          <Tab.Screen 
            name="Notes" 
            component={NoteScreen} 
            options={{
              title: 'AI Notes',
            }}
          />
          <Tab.Screen 
            name="Grocery" 
            component={GroceryScreen} 
            options={{
              title: 'Grocery List',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  tabBar: {
    backgroundColor: '#1A1A22',
    borderTopWidth: 0,
    elevation: 8,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  header: {
    backgroundColor: '#121214',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
}); 