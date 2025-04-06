import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import landing from '../assets/images/retsutomo-landing-page.png';

export default function LandingPage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);

  const onboardingPages = [
    {
      title: "Welcome to RetsuTomo",
      description: "The smart queue management system that works for both businesses and customers.",
      icon: "store-check",
    },
    {
      title: "For Businesses",
      description: "Create and manage queues for your business. Track waiting customers and serve them efficiently.",
      icon: "store-settings",
    },
    {
      title: "For Customers",
      description: "Find businesses, join queues remotely, and get notified when it's your turn.",
      icon: "account-clock",
    }
  ];

  const nextPage = () => {
    if (currentPage < onboardingPages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      navigation.navigate('LoginPage');
    }
  };

  useEffect(() => {
    const checkAuthState = () => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
          // User is signed in, navigate to MainApp
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
          });
        }
      });
      
      return unsubscribe;
    };
    
    const unsubscribe = checkAuthState();
    return () => unsubscribe();
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      
      <View style={[styles.hero, { backgroundColor: theme.primaryLight }]}>
        <Image
          source={landing}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.content}>
        <View style={styles.contentHeader}>
          <Text style={[styles.appTitle, { color: theme.primary }]}>RetsuTomo</Text>
          <Text style={[styles.title, { color: theme.text }]}>{onboardingPages[currentPage].title}</Text>
          <Text style={[styles.text, { color: theme.secondaryText }]}>
            {onboardingPages[currentPage].description}
          </Text>
        </View>
        
        <View style={styles.featureContainer}>
          <View style={[styles.featureCard, { backgroundColor: theme.card }]}>
            <Icon name="store" size={24} color={theme.primary} style={styles.featureIcon} />
            <Text style={[styles.featureTitle, { color: theme.text }]}>Manage Business Queues</Text>
          </View>
          
          <View style={[styles.featureCard, { backgroundColor: theme.card }]}>
            <Icon name="account-multiple" size={24} color={theme.primary} style={styles.featureIcon} />
            <Text style={[styles.featureTitle, { color: theme.text }]}>Join Queues Remotely</Text>
          </View>
          
          <View style={[styles.featureCard, { backgroundColor: theme.card }]}>
            <Icon name="bell-ring" size={24} color={theme.primary} style={styles.featureIcon} />
            <Text style={[styles.featureTitle, { color: theme.text }]}>Real-time Notifications</Text>
          </View>
        </View>

        <View style={styles.paginationContainer}>
          {onboardingPages.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.paginationDot, 
                { backgroundColor: theme.isDarkMode ? '#444444' : '#d8dffe' },
                currentPage === index && [styles.paginationDotActive, { backgroundColor: theme.primary }]
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={nextPage}>
          <Text style={styles.buttonText}>
            {currentPage < onboardingPages.length - 1 ? "Next" : "Get Started"}
          </Text>
          <Icon name="arrow-right" size={20} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>
        
        {currentPage < onboardingPages.length - 1 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.navigate('LoginPage')}>
            <Text style={[styles.skipButtonText, { color: theme.secondaryText }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: 280,
  },
  content: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  contentHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
  },
  featureContainer: {
    marginVertical: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});