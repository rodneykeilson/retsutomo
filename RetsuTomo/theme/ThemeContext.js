import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Define theme colors
export const lightTheme = {
  background: '#f5f5f5',
  card: '#ffffff',
  cardBackground: '#ffffff',
  highlightBackground: '#f0eeff',
  text: '#281b52',
  secondaryText: '#9992a7',
  primary: '#56409e',
  primaryLight: '#f0eeff',
  border: '#e0e0e0',
  shadowColor: '#000',
  success: '#43A047',
  warning: '#FB8C00',
  error: '#F44336',
  statusBar: 'dark-content',
};

export const darkTheme = {
  background: '#121212',
  card: '#1e1e1e',
  cardBackground: '#1e1e1e',
  highlightBackground: '#2a2438',
  text: '#f5f5f5',
  secondaryText: '#a0a0a0',
  primary: '#9c82e0',
  primaryLight: '#2a2438',
  border: '#333333',
  shadowColor: '#000',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  statusBar: 'light-content',
};

const ThemeContext = createContext({
  isDarkMode: false,
  theme: lightTheme,
  toggleTheme: () => {},
});

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(deviceTheme === 'dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load theme preference from AsyncStorage
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('theme');
        if (storedTheme === 'dark' || storedTheme === 'light') {
          setIsDarkMode(storedTheme === 'dark');
        } else {
          setIsDarkMode(deviceTheme === 'dark');
        }
      } catch (e) {
        setIsDarkMode(deviceTheme === 'dark');
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, [deviceTheme]);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode, isLoading]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  if (isLoading) return null; // Optionally render a splash/loading screen

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
