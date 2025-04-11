/**
 * Migration script to create user entries in the 'users' collection for existing users
 * Run this script once to migrate existing user profiles
 */

import { firebase } from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';

if (!firebase.apps.length) {
  firebase.initializeApp();
}

const auth = firebase.auth();
const firestore = firebase.firestore();

// Function to migrate users from profiles to users collection
async function migrateUsers() {
  try {
    console.log('Starting user migration...');
    
    // Get all users from authentication
    const usersList = await auth.listUsers();
    const authUsers = usersList.users || [];
    
    // For each authenticated user
    for (const authUser of authUsers) {
      const userId = authUser.uid;
      
      // Check if user already exists in 'users' collection
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        // Check if profile exists
        const profileDoc = await firestore.collection('profiles').doc(userId).get();
        
        if (profileDoc.exists) {
          const profileData = profileDoc.data();
          
          // Create new user document
          await firestore.collection('users').doc(userId).set({
            displayName: profileData.name || authUser.displayName || 'User',
            email: authUser.email,
            role: 'user', // Default role
            createdAt: profileData.createdAt || new Date(),
            migratedAt: new Date(),
          });
          
          console.log(`Migrated user: ${userId}`);
        } else {
          // No profile, create minimal user document
          await firestore.collection('users').doc(userId).set({
            displayName: authUser.displayName || 'User',
            email: authUser.email,
            role: 'user',
            createdAt: new Date(),
            migratedAt: new Date(),
          });
          
          console.log(`Created new user document for: ${userId}`);
        }
      } else {
        console.log(`User ${userId} already exists in users collection`);
      }
    }
    
    console.log('User migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Execute the migration
migrateUsers();
