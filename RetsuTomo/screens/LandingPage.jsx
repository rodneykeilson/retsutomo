import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';

import landing from '../assets/images/retsutomo-landing-page.png'

export default function LandingPage() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={landing}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.content}>
        <View style={styles.contentHeader}>
          {/* <Text style={styles.title}>
            Smarter queues,
            <View style={styles.appName}>
              <Text style={styles.appNameText}>Happier Customers</Text>
            </View>
          </Text> */}
          <Text style={styles.text}>
            Manage your queues with ease using our
            simple and effective queue management system.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            // handle onPress
          }}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Let's go</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: '#281b52',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    color: '#9992a7',
    textAlign: 'center',
  },
  hero: {
    backgroundColor: '#d8dffe',
    margin: 0,
    borderRadius: 16,
    padding: 16,
  },
  heroImage: {
    width: '100%',
    height: 400,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  contentHeader: {
    paddingHorizontal: 10,
  },
  appName: {
    backgroundColor: '#fff2dd',
    transform: [
      {
        rotate: '-5deg',
      },
    ],
    paddingHorizontal: 6,
  },
  appNameText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#281b52',
  },
  button: {
    backgroundColor: '#56409e',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
});