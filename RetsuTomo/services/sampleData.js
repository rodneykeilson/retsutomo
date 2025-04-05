import { firestore, auth } from './firebase';
import { Alert } from 'react-native';
import { firebase } from '@react-native-firebase/app';

// Sample business data
const sampleBusinesses = [
  {
    name: 'Sunshine Cafe',
    description: 'Cozy cafe with great coffee and pastries',
    category: 'Food & Beverage',
    address: '123 Main Street',
    maxQueueSize: 20,
    estimatedTimePerCustomer: 10, // in minutes
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8Y2FmZXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60',
  },
  {
    name: 'Quick Health Clinic',
    description: 'Walk-in clinic for minor health concerns',
    category: 'Healthcare',
    address: '456 Oak Avenue',
    maxQueueSize: 15,
    estimatedTimePerCustomer: 15, // in minutes
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8Y2xpbmljfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
  },
  {
    name: 'Tech Repair Hub',
    description: 'Fast and reliable device repair services',
    category: 'Services',
    address: '789 Pine Street',
    maxQueueSize: 10,
    estimatedTimePerCustomer: 30, // in minutes
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cmVwYWlyfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
  },
  {
    name: 'Gourmet Burger Joint',
    description: 'Premium burgers made with locally sourced ingredients',
    category: 'Food & Beverage',
    address: '321 Maple Road',
    maxQueueSize: 25,
    estimatedTimePerCustomer: 12, // in minutes
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8YnVyZ2VyfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
  },
  {
    name: 'Zen Spa & Wellness',
    description: 'Relaxing spa treatments and wellness services',
    category: 'Health & Beauty',
    address: '555 Relaxation Way',
    maxQueueSize: 8,
    estimatedTimePerCustomer: 60, // in minutes
    status: 'open',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8c3BhfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
  },
];

// Function to populate the database with sample data
export const populateSampleData = async () => {
  try {
    // Check if sample data already exists
    const businessSnapshot = await firestore.collection('businesses').limit(1).get();
    
    if (!businessSnapshot.empty) {
      console.log('Sample data already exists');
      return;
    }
    
    // Add sample businesses
    for (const business of sampleBusinesses) {
      const businessRef = await firestore.collection('businesses').add(business);
      
      // Add sample queues for this business
      const sampleQueueSize = Math.floor(Math.random() * 6);
      
      for (let i = 0; i < sampleQueueSize; i++) {
        const queueNumber = i + 1;
        await firestore
          .collection('businesses')
          .doc(businessRef.id)
          .collection('queues')
          .add({
            userId: `sample-user-${i}`,
            userName: `Customer ${i + 1}`,
            userEmail: `sample${i}@example.com`,
            queueNumber: queueNumber,
            status: 'active',
            createdAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() - (i * 15 * 60 * 1000))),
          });
      }
    }
    
    console.log('Sample data populated successfully');
  } catch (error) {
    console.error('Error populating sample data:', error);
    Alert.alert('Error', 'Failed to populate sample data');
  }
};

// Function to create a sample business for the current user
export const createSampleBusinessForUser = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }
    
    // Generate a unique name for the sample business
    const businessCount = await firestore
      .collection('businesses')
      .where('ownerId', '==', user.uid)
      .get()
      .then(snapshot => snapshot.size);
    
    // Create a sample business for the user
    const businessData = {
      name: `My Business ${businessCount + 1}`,
      description: 'This is your sample business. Edit the details to get started!',
      category: 'Other',
      address: 'Your Business Address',
      maxQueueSize: 20,
      estimatedTimePerCustomer: 15,
      status: 'open',
      ownerId: user.uid,
      createdAt: new Date(),
    };
    
    const businessRef = await firestore.collection('businesses').add(businessData);
    console.log('Sample business created for user:', businessRef.id);
    
    return businessRef.id;
  } catch (error) {
    console.error('Error creating sample business:', error);
    Alert.alert('Error', 'Failed to create sample business');
    return null;
  }
};

// Function to join a sample queue for testing
export const joinSampleQueue = async (userId) => {
  try {
    if (!userId) {
      console.log('No user ID provided');
      return null;
    }
    
    // Get a random business to join
    const businessSnapshot = await firestore.collection('businesses').get();
    
    if (businessSnapshot.empty) {
      console.log('No businesses found');
      return null;
    }
    
    const businesses = businessSnapshot.docs;
    const randomIndex = Math.floor(Math.random() * businesses.length);
    const businessDoc = businesses[randomIndex];
    const businessId = businessDoc.id;
    const businessData = businessDoc.data();
    
    // Check if user already has active queues
    const userQueuesSnapshot = await firestore
      .collection('users')
      .doc(userId)
      .collection('activeQueues')
      .limit(1)
      .get();
    
    if (!userQueuesSnapshot.empty) {
      console.log('User already has active queues');
      return userQueuesSnapshot.docs[0].id;
    }
    
    // Get current queue size
    const queueSnapshot = await firestore
      .collection('businesses')
      .doc(businessId)
      .collection('queues')
      .where('status', '==', 'active')
      .get();
    
    const newQueueNumber = queueSnapshot.size + 1;
    
    // Add to user's active queues
    const userQueueRef = await firestore
      .collection('users')
      .doc(userId)
      .collection('activeQueues')
      .add({
        businessId: businessId,
        businessName: businessData.name,
        queueNumber: newQueueNumber,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    
    // Add to business queues
    const businessQueueRef = await firestore
      .collection('businesses')
      .doc(businessId)
      .collection('queues')
      .add({
        userId: userId,
        userName: 'Sample User',
        userEmail: 'sample@example.com',
        queueNumber: newQueueNumber,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    
    console.log('User joined sample queue:', businessQueueRef.id);
    return businessQueueRef.id;
  } catch (error) {
    console.error('Error joining sample queue:', error);
    return null;
  }
};

// Function to get AI-powered insights about queue patterns (placeholder for Vertex AI integration)
export const getQueueInsights = async (businessId) => {
  // This is a placeholder for future Vertex AI integration
  // In a real implementation, this would call Vertex AI to analyze queue data
  
  try {
    // Get historical queue data
    const queueSnapshot = await firestore
      .collection('businesses')
      .doc(businessId)
      .collection('queues')
      .get();
    
    if (queueSnapshot.empty) {
      return {
        busyTimes: ['Not enough data'],
        averageWaitTime: 'N/A',
        recommendations: ['Start collecting queue data to get AI-powered insights'],
      };
    }
    
    // Mock insights that would come from Vertex AI
    return {
      busyTimes: ['Weekdays 12-2 PM', 'Weekends 6-8 PM'],
      averageWaitTime: '18 minutes',
      recommendations: [
        'Consider adding more staff during peak hours',
        'Optimize your service process to reduce wait times',
        'Send notifications to customers when their turn is approaching'
      ],
    };
  } catch (error) {
    console.error('Error getting queue insights:', error);
    return {
      error: 'Failed to generate insights',
      message: error.message,
    };
  }
};

export default {
  populateSampleData,
  createSampleBusinessForUser,
  joinSampleQueue,
  getQueueInsights,
};
