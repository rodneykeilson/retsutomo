import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { firebase } from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';

import LandingPage from './screens/LandingPage';
import LoginPage from './screens/LoginPage';
import RegisterPage from './screens/RegisterPage';
import ForgotPasswordPage from './screens/ForgotPasswordPage';
import DashboardPage from './screens/DashboardPage';
import ManageQueuesPage from './screens/ManageQueuesPage';
import ManageBusinessesPage from './screens/ManageBusinessesPage';
import ProfilePage from './screens/ProfilePage';
import BusinessListPage from './screens/BusinessListPage';
import QueuePage from './screens/QueuePage';
import MyQueuesPage from './screens/MyQueuesPage';
import AdminDashboardPage from './screens/AdminDashboardPage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom tab bar indicator
const TabBarIndicator = ({ state, descriptors, navigation }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.tabBarIndicator}>
      <View 
        style={[
          styles.indicator, 
          { 
            left: `${(100 / state.routes.length) * state.index}%`,
            width: `${100 / state.routes.length}%`,
            backgroundColor: theme.primary,
          }
        ]} 
      />
    </View>
  );
};

// Main tab navigator for authenticated users
function MainTabs() {
  const { theme } = useTheme();
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    // Check if the current user is an admin
    const checkAdminStatus = async () => {
      try {
        const user = firebase.auth().currentUser;
        if (user) {
          const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondaryText,
        tabBarStyle: {
          ...styles.tabBar,
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Businesses') {
            iconName = focused ? 'store' : 'store-outline';
          } else if (route.name === 'MyQueues') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          } else if (route.name === 'AdminDashboard') {
            iconName = focused ? 'crown' : 'crown-outline';
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardPage} />
      <Tab.Screen 
        name="Businesses" 
        component={BusinessListPage}
        options={{ title: 'Businesses' }}
      />
      <Tab.Screen 
        name="MyQueues" 
        component={MyQueuesPage}
        options={{ title: 'My Queues' }}
      />
      <Tab.Screen name="Profile" component={ProfilePage} />
      {isAdmin && (
        <Tab.Screen 
          name="AdminDashboard" 
          component={AdminDashboardPage}
          options={{ title: 'Admin' }}
        />
      )}
    </Tab.Navigator>
  );
}

// Create custom navigation themes
const createCustomTheme = (baseTheme, appTheme) => {
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: appTheme.primary,
      background: appTheme.background,
      card: appTheme.card,
      text: appTheme.text,
      border: appTheme.border,
    },
  };
};

// App component with theme support
function AppContent() {
  const { theme, isDarkMode } = useTheme();
  
  // Create navigation theme based on current app theme
  const navigationTheme = createCustomTheme(
    isDarkMode ? DarkTheme : DefaultTheme,
    theme
  );
  
  return (
    <>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator initialRouteName="LandingPage" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="LandingPage" component={LandingPage} />
          <Stack.Screen name="LoginPage" component={LoginPage} />
          <Stack.Screen name="RegisterPage" component={RegisterPage} />
          <Stack.Screen name="ForgotPasswordPage" component={ForgotPasswordPage} />
          <Stack.Screen name="MainApp" component={MainTabs} />
          <Stack.Screen name="ManageQueuesPage" component={ManageQueuesPage} />
          <Stack.Screen name="ManageBusinessesPage" component={ManageBusinessesPage} />
          <Stack.Screen name="QueuePage" component={QueuePage} />
          <Stack.Screen name="MyQueuesPage" component={MyQueuesPage} />
          <Stack.Screen name="BusinessListPage" component={BusinessListPage} />
          <Stack.Screen name="AdminDashboardPage" component={AdminDashboardPage} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    elevation: 0,
    paddingBottom: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabBarIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  indicator: {
    position: 'absolute',
    height: 3,
    bottom: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  }
});