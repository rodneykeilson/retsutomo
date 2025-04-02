import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LandingPage">
        <Stack.Screen name="LandingPage" component={LandingPage} options={{ headerShown: false }} />
        <Stack.Screen name="LoginPage" component={LoginPage} options={{ headerShown: false }} />
        <Stack.Screen name="RegisterPage" component={RegisterPage} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPasswordPage" component={ForgotPasswordPage} options={{ headerShown: false }} />
        <Stack.Screen name="DashboardPage" component={DashboardPage} options={{ headerShown: false }} />
        <Stack.Screen name="ManageQueuesPage" component={ManageQueuesPage} options={{ headerShown: false }} />
        <Stack.Screen name="ManageBusinessesPage" component={ManageBusinessesPage} options={{ headerShown: false }} />
        <Stack.Screen name="ProfilePage" component={ProfilePage} options={{ headerShown: false }} />
        <Stack.Screen name="BusinessListPage" component={BusinessListPage} options={{ headerShown: false }} />
        <Stack.Screen name="QueuePage" component={QueuePage} options={{ headerShown: false }} />
        <Stack.Screen name="MyQueuesPage" component={MyQueuesPage} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 