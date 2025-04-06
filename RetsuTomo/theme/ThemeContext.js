import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Define theme colors
export const lightTheme = {
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#281b52',
  secondaryText: '#9992a7',
  primary: '#56409e',
  primaryLight: '#f0eeff',
  border: '#e0e0e0',
  success: '#43A047',
  warning: '#FB8C00',
  error: '#F44336',
  statusBar: 'dark-content',
};

export const darkTheme = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#f5f5f5',
  secondaryText: '#a0a0a0',
  primary: '#9c82e0',
  primaryLight: '#2a2438',
  border: '#333333',
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

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(deviceTheme === 'dark');

  // Update theme if device theme changes
  useEffect(() => {
    setIsDarkMode(deviceTheme === 'dark');
  }, [deviceTheme]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
