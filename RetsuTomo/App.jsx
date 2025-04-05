import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom tab bar indicator
const TabBarIndicator = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarIndicator}>
      <View 
        style={[
          styles.indicator, 
          { 
            left: `${(100 / state.routes.length) * state.index}%`,
            width: `${100 / state.routes.length}%`,
          }
        ]} 
      />
    </View>
  );
};

// Main tab navigator for authenticated users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#56409e',
        tabBarInactiveTintColor: '#9992a7',
        tabBarStyle: styles.tabBar,
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
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    elevation: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
    backgroundColor: '#56409e',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  }
});