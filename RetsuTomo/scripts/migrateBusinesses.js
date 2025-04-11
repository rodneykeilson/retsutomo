/**
 * Migration script to add approval status to existing businesses
 * Run this script once to update existing businesses
 */

import { firebase } from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';

if (!firebase.apps.length) {
  firebase.initializeApp();
}

const firestore = firebase.firestore();

// Function to migrate businesses to include approval status
async function migrateBusinesses() {
  try {
    console.log('Starting business migration...');
    
    // Get all businesses without approval status
    const businessesSnapshot = await firestore
      .collection('businesses')
      .get();
    
    const batch = firestore.batch();
    let updateCount = 0;
    
    businessesSnapshot.docs.forEach(doc => {
      const businessData = doc.data();
      
      // Only update if approvalStatus is not set
      if (!businessData.approvalStatus) {
        const businessRef = firestore.collection('businesses').doc(doc.id);
        batch.update(businessRef, {
          approvalStatus: 'pending', // Set all existing businesses to pending
          updatedAt: new Date()
        });
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Updated ${updateCount} businesses with approval status`);
    } else {
      console.log('No businesses needed updating');
    }
    
    console.log('Business migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Execute the migration
migrateBusinesses();
