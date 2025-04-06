import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme, theme } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.card }]} 
      onPress={toggleTheme}
    >
      <Icon 
        name={isDarkMode ? 'weather-night' : 'white-balance-sunny'} 
        size={20} 
        color={theme.primary} 
      />
      <Text style={[styles.text, { color: theme.text }]}>
        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  }
});

export default ThemeToggle;
