import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

class NotificationService {
  constructor() {
    this.messageListener = null;
    this.notificationOpenedAppListener = null;
    this.onTokenRefreshListener = null;
    this.backgroundMessageHandler = null;
  }

  async requestUserPermission() {
    if (Platform.OS === 'android') {
      try {
        // Request Android notification permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission granted');
          return true;
        } else {
          console.log('Notification permission denied');
          return false;
        }
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      // Request iOS notification permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    }
    return false;
  }

  async getToken() {
    try {
      // Check if permission is granted
      const hasPermission = await this.requestUserPermission();
      if (!hasPermission) {
        console.log('Cannot get token: notification permission not granted');
        return null;
      }
      
      // Get FCM token
      const token = await messaging().getToken();
      if (token) {
        await this.updateUserToken(token);
        return token;
      }
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
    return null;
  }

  async updateUserToken(token) {
    try {
      const user = auth().currentUser;
      if (user) {
        // Update user's FCM token in Firestore
        await firestore()
          .collection('users')
          .doc(user.uid)
          .update({
            fcmToken: token,
            tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
          });

        // Check if user is a business owner
        const userDoc = await firestore()
          .collection('users')
          .doc(user.uid)
          .get();
        const userData = userDoc.data();

        if (userData && userData.businessId) {
          // Also update business document with the token
          await firestore()
            .collection('businesses')
            .doc(userData.businessId)
            .update({
              ownerFcmToken: token,
              tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }

        // Check if user is an admin
        if (userData && userData.isAdmin) {
          // Update admin collection
          await firestore()
            .collection('admins')
            .doc(user.uid)
            .update({
              fcmToken: token,
              tokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }
      }
    } catch (error) {
      console.error('Failed to update FCM token in Firestore:', error);
    }
  }

  setupMessageListeners(onNotificationReceived, onNotificationOpened) {
    // Handle foreground messages
    this.messageListener = messaging().onMessage(async remoteMessage => {
      console.log('Notification received in foreground:', remoteMessage);
      
      // Call the callback if provided
      if (onNotificationReceived) {
        onNotificationReceived(remoteMessage);
      }
      
      // Store notification in Firestore
      this.storeNotification(remoteMessage);
    });
    
    // Handle notification opened
    this.notificationOpenedAppListener = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened app from background state:', remoteMessage);
      
      // Call the callback if provided
      if (onNotificationOpened) {
        onNotificationOpened(remoteMessage);
      }
      
      // Mark notification as read
      this.markNotificationAsRead(remoteMessage);
    });
    
    // Check if app was opened from a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification opened app from quit state:', remoteMessage);
          
          // Call the callback if provided
          if (onNotificationOpened) {
            onNotificationOpened(remoteMessage);
          }
          
          // Mark notification as read
          this.markNotificationAsRead(remoteMessage);
        }
      });
    
    // Handle token refresh
    this.onTokenRefreshListener = messaging().onTokenRefresh(token => {
      console.log('FCM Token refreshed:', token);
      this.updateUserToken(token);
    });
    
    // Set up background message handler
    this.setupBackgroundHandler();
  }
  
  setupBackgroundHandler() {
    // Register background handler
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background:', remoteMessage);
      
      // Store notification in Firestore
      return this.storeNotification(remoteMessage);
    });
  }
  
  async storeNotification(remoteMessage) {
    try {
      const user = auth().currentUser;
      if (!user) return;
      
      const { notification, data } = remoteMessage;
      
      // Create notification object
      const notificationData = {
        title: notification?.title || 'New Notification',
        body: notification?.body || '',
        data: data || {},
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      
      // Store in Firestore
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('notifications')
        .add(notificationData);
        
      return notificationData;
    } catch (error) {
      console.error('Failed to store notification:', error);
      return null;
    }
  }
  
  async markNotificationAsRead(remoteMessage) {
    try {
      const user = auth().currentUser;
      if (!user || !remoteMessage.data?.notificationId) return;
      
      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('notifications')
        .doc(remoteMessage.data.notificationId)
        .update({ read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async sendNotification(userIds, title, body, data = {}) {
    try {
      // Get tokens for all users
      const tokensSnapshot = await firestore()
        .collection('users')
        .where(firestore.FieldPath.documentId(), 'in', userIds)
        .get();

      const tokens = [];
      tokensSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.log('No valid FCM tokens found for users');
        return;
      }

      // Store notification in each user's collection
      for (const userId of userIds) {
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .add({
            title,
            body,
            data,
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
      }

      // Send notification via Cloud Function (will need to be implemented)
      // This is just a placeholder - actual implementation will use Firebase Cloud Functions
      console.log(`Sending notification to ${tokens.length} users: ${title}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async sendQueueNotification(userId, businessId, queueNumber, status, additionalData = {}) {
    try {
      // Get user and business details
      const [userDoc, businessDoc] = await Promise.all([
        firestore().collection('users').doc(userId).get(),
        firestore().collection('businesses').doc(businessId).get()
      ]);

      if (!userDoc.exists || !businessDoc.exists) {
        console.error('User or business not found');
        return;
      }

      const userData = userDoc.data();
      const businessData = businessDoc.data();

      let title = '';
      let body = '';

      // Customize notification based on status
      switch (status) {
        case 'active':
          title = 'Queue Joined';
          body = `You have joined the queue at ${businessData.name}. Your number is ${queueNumber}.`;
          break;
        case 'current':
          title = 'Your Turn Now!';
          body = `It's your turn at ${businessData.name}. Please proceed to the counter.`;
          break;
        case 'finished':
          title = 'Queue Completed';
          body = `You have been served at ${businessData.name}. Thank you for your visit!`;
          break;
        case 'cancelled':
          title = 'Queue Cancelled';
          body = `Your queue at ${businessData.name} has been cancelled.`;
          break;
        default:
          title = 'Queue Update';
          body = `Your queue status at ${businessData.name} has been updated to ${status}.`;
      }

      // Send notification to user
      if (userData.fcmToken) {
        // Store notification in user's collection
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .add({
            title,
            body,
            data: {
              type: 'queue',
              businessId,
              businessName: businessData.name,
              queueNumber,
              status,
              ...additionalData
            },
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        // Send FCM notification (via Cloud Function)
        console.log(`Sending queue notification to user ${userId}: ${title}`);
      }

      // If status is 'active', also notify business owner
      if (status === 'active' && businessData.ownerFcmToken) {
        const businessNotificationTitle = 'New Customer in Queue';
        const businessNotificationBody = `${userData.displayName || 'A customer'} has joined your queue. Queue number: ${queueNumber}.`;

        // Store notification in business owner's collection
        await firestore()
          .collection('users')
          .doc(businessData.ownerId)
          .collection('notifications')
          .add({
            title: businessNotificationTitle,
            body: businessNotificationBody,
            data: {
              type: 'business_queue',
              userId,
              userName: userData.displayName || 'Anonymous',
              queueNumber,
              status: 'active',
            },
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        // Send FCM notification to business owner (via Cloud Function)
        console.log(`Sending queue notification to business owner ${businessData.ownerId}: ${businessNotificationTitle}`);
      }
    } catch (error) {
      console.error('Failed to send queue notification:', error);
    }
  }

  async sendBusinessApprovalNotification(businessId, status, reason = '') {
    try {
      // Get business details
      const businessDoc = await firestore()
        .collection('businesses')
        .doc(businessId)
        .get();
      
      if (!businessDoc.exists) {
        console.error('Business not found');
        return;
      }

      const businessData = businessDoc.data();
      const ownerId = businessData.ownerId;

      if (!ownerId) {
        console.error('Business owner not found');
        return;
      }

      // Get owner details
      const ownerDoc = await firestore()
        .collection('users')
        .doc(ownerId)
        .get();
        
      if (!ownerDoc.exists) {
        console.error('Business owner document not found');
        return;
      }

      const ownerData = ownerDoc.data();

      let title = '';
      let body = '';

      // Customize notification based on approval status
      if (status === 'approved') {
        title = 'Business Approved!';
        body = `Your business ${businessData.name} has been approved. You can now start accepting customers.`;
      } else if (status === 'rejected') {
        title = 'Business Registration Rejected';
        body = `Your business ${businessData.name} registration was not approved.${reason ? ` Reason: ${reason}` : ''}`;
      } else {
        title = 'Business Status Updated';
        body = `Your business ${businessData.name} status has been updated to ${status}.`;
      }

      // Store notification in owner's collection
      await firestore()
        .collection('users')
        .doc(ownerId)
        .collection('notifications')
        .add({
          title,
          body,
          data: {
            type: 'business_approval',
            businessId,
            businessName: businessData.name,
            status,
            reason
          },
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      // Send FCM notification to owner (via Cloud Function)
      if (ownerData.fcmToken) {
        console.log(`Sending business approval notification to owner ${ownerId}: ${title}`);
      }

      // Also notify admins about the approval action
      const adminsSnapshot = await firestore()
        .collection('users')
        .where('isAdmin', '==', true)
        .get();
        
      for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();
        const adminId = adminDoc.id;

        // Skip if the admin is the one who performed the action
        if (adminId === auth().currentUser?.uid) continue;

        const adminTitle = `Business ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        const adminBody = `Business ${businessData.name} has been ${status} ${reason ? `(Reason: ${reason})` : ''}`;

        // Store notification in admin's collection
        await firestore()
          .collection('users')
          .doc(adminId)
          .collection('notifications')
          .add({
            title: adminTitle,
            body: adminBody,
            data: {
              type: 'admin_business_approval',
              businessId,
              businessName: businessData.name,
              ownerId,
              ownerName: ownerData.displayName || 'Unknown',
              status,
              reason
            },
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        // Send FCM notification to admin (via Cloud Function)
        if (adminData.fcmToken) {
          console.log(`Sending business approval notification to admin ${adminId}: ${adminTitle}`);
        }
      }
    } catch (error) {
      console.error('Failed to send business approval notification:', error);
    }
  }

  removeListeners() {
    if (this.messageListener) {
      this.messageListener();
      this.messageListener = null;
    }
    if (this.notificationOpenedAppListener) {
      this.notificationOpenedAppListener();
      this.notificationOpenedAppListener = null;
    }
    if (this.onTokenRefreshListener) {
      this.onTokenRefreshListener();
      this.onTokenRefreshListener = null;
    }
  }
}

export default new NotificationService();
