import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import landing from '../assets/images/retsutomo-landing-page.png';

export default function LandingPage() {
  const navigation = useNavigation();
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#d8dffe" barStyle="dark-content" />
      
      <View style={styles.hero}>
        <Image
          source={landing}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.content}>
        <View style={styles.contentHeader}>
          <Text style={styles.appTitle}>RetsuTomo</Text>
          <Text style={styles.title}>{onboardingPages[currentPage].title}</Text>
          <Text style={styles.text}>
            {onboardingPages[currentPage].description}
          </Text>
        </View>
        
        <View style={styles.featureContainer}>
          <View style={styles.featureCard}>
            <Icon name="store" size={24} color="#56409e" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Manage Business Queues</Text>
          </View>
          
          <View style={styles.featureCard}>
            <Icon name="account-multiple" size={24} color="#56409e" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Join Queues Remotely</Text>
          </View>
          
          <View style={styles.featureCard}>
            <Icon name="bell-ring" size={24} color="#56409e" style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Real-time Notifications</Text>
          </View>
        </View>

        <View style={styles.paginationContainer}>
          {onboardingPages.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.paginationDot, 
                currentPage === index && styles.paginationDotActive
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
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
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hero: {
    backgroundColor: '#d8dffe',
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
    color: '#56409e',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#281b52',
    textAlign: 'center',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: '#9992a7',
    textAlign: 'center',
  },
  featureContainer: {
    marginVertical: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    color: '#281b52',
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
    backgroundColor: '#d8dffe',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#56409e',
    width: 20,
  },
  button: {
    backgroundColor: '#56409e',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9992a7',
  },
});