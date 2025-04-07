import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import landing from '../assets/images/retsutomo-landing-page.png';

export default function LandingPage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]} edges={['top']}>
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
          <Text style={[styles.title, { color: theme.primary }]}>{onboardingPages[currentPage].title}</Text>
          <Text style={[styles.text, { color: theme.secondaryText }]}>
            {onboardingPages[currentPage].description}
          </Text>
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
    height: 220,
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
  title: {
    fontSize: 28,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    marginBottom: 16,
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
    padding: 8,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});