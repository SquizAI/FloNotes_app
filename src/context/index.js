import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Define theme colors
const lightTheme = {
  primary: '#0066CC',
  secondary: '#FF9900',
  background: '#FFFFFF',
  card: '#F5F5F5',
  text: '#000000',
  border: '#DDDDDD',
  dark: false,
};

const darkTheme = {
  primary: '#0099FF',
  secondary: '#FFCC00',
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  border: '#333333',
  dark: true,
};

// Create theme context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme();
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);

  // Update theme when system theme changes
  useEffect(() => {
    setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for using theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 