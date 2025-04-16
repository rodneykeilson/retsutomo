import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../theme/ThemeContext';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { theme } = useTheme();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const user = auth().currentUser;
      
      if (!user) {
        navigation.replace('LoginPage');
        return;
      }

      const notificationsSnapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const notificationsData = [];
      notificationsSnapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
        
        notificationsData.push({
          id: doc.id,
          ...data,
          createdAt
        });
      });

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      return () => {};
    }, [])
  );

  const markAsRead = async (notificationId) => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('notifications')
        .doc(notificationId)
        .update({
          read: true
        });

      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data) {
      const { type } = notification.data;

      switch (type) {
        case 'queue':
          // Navigate to queue details
          if (notification.data.businessId) {
            navigation.navigate('QueuePage', { businessId: notification.data.businessId });
          }
          break;
        case 'business_queue':
          // For business owners, navigate to queue management
          navigation.navigate('ManageQueuesPage', { businessId: notification.data.businessId });
          break;
        case 'business_approval':
          // Navigate to business details
          if (notification.data.businessId) {
            navigation.navigate('BusinessDetailsPage', { businessId: notification.data.businessId });
          }
          break;
        case 'admin_business_approval':
          // For admins, navigate to admin business approval screen
          navigation.navigate('AdminDashboardPage');
          break;
        default:
          // Default action for unknown notification types
          console.log('Unknown notification type:', type);
      }
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
      }
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderNotificationItem = ({ item }) => {
    // Use proper theme colors for dark mode compatibility
    const backgroundColor = item.read ? theme.cardBackground : theme.highlightBackground;
    const textColor = theme.textColor;
    const secondaryTextColor = theme.textSecondary || theme.textColor;
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor,
            borderColor: theme.borderColor,
            borderWidth: 1,
            shadowColor: theme.shadowColor,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: textColor }]}>{item.title}</Text>
          <Text style={[styles.notificationBody, { color: textColor }]}>{item.body}</Text>
          <Text style={[styles.notificationTime, { color: secondaryTextColor }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        {!item.read && (
          <View style={[styles.unreadIndicator, { backgroundColor: theme.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  const markAllAsRead = async () => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const batch = firestore().batch();
      const unreadNotifications = notifications.filter(notification => !notification.read);

      // No unread notifications
      if (unreadNotifications.length === 0) return;

      // Update each unread notification
      for (const notification of unreadNotifications) {
        const notificationRef = firestore()
          .collection('users')
          .doc(user.uid)
          .collection('notifications')
          .doc(notification.id);
        
        batch.update(notificationRef, { read: true });
      }

      await batch.commit();

      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );

      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={[styles.headerTitle, { color: '#fff' }]}>Notifications</Text>
        {notifications.some(notification => !notification.read) && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={[styles.markAllText, { color: '#fff' }]}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 20 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-none" size={80} color={theme.textSecondary || theme.textColor} />
          <Text style={[styles.emptyText, { color: theme.textSecondary || theme.textColor }]}>
            No notifications yet
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    // color will be set inline using theme
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default NotificationsScreen;
