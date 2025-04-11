import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';
import NotificationService from '../services/NotificationService';

const QueueManagement = ({ business }) => {
  const { theme } = useTheme();
  const [activeQueues, setActiveQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(business || null);
  const businessId = business?.id;

  useEffect(() => {
    if (!businessId) return;
    if (business) {
      setBusinessData(business);
    }

    // Set up real-time listener for queues
    const unsubscribe = firestore()
      .collection('businesses')
      .doc(businessId)
      .collection('queues')
      .where('status', 'in', ['active', 'waiting', 'current'])
      .orderBy('queueNumber', 'asc')
      .onSnapshot(
        (snapshot) => {
          const queuesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setActiveQueues(queuesData);
          setLoading(false);
        },
        (error) => {
          console.error('Queue listener error:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [businessId, business]);

  const handleServeNext = async () => {
    if (activeQueues.length === 0) {
      Alert.alert('No customers', 'There are no customers in the queue.');
      return;
    }

    try {
      const nextCustomer = activeQueues[0];
      const finishedAt = firebase.firestore.FieldValue.serverTimestamp();
      
      // Update the queue status to finished
      await firestore()
        .collection('businesses')
        .doc(businessId)
        .collection('queues')
        .doc(nextCustomer.id)
        .update({
          status: 'finished',
          finishedAt: finishedAt,
        });

      // Remove from user's active queues
      if (nextCustomer.userId) {
        try {
          // First check if the user has this queue in their active queues
          const userActiveQueueRef = await firestore()
            .collection('users')
            .doc(nextCustomer.userId)
            .collection('activeQueues')
            .where('businessId', '==', businessId)
            .where('queueNumber', '==', nextCustomer.queueNumber)
            .get();
          
          // Delete from active queues
          if (!userActiveQueueRef.empty) {
            await firestore()
              .collection('users')
              .doc(nextCustomer.userId)
              .collection('activeQueues')
              .doc(userActiveQueueRef.docs[0].id)
              .delete();
          }
          
          // Get user data to ensure we have the correct display name
          const userDoc = await firestore().collection('users').doc(nextCustomer.userId).get();
          const userData = userDoc.exists ? userDoc.data() : {};
          const userName = userData.displayName || nextCustomer.userName || 'Anonymous';
          
          // Add to user's queue history
          await firestore()
            .collection('users')
            .doc(nextCustomer.userId)
            .collection('queueHistory')
            .add({
              businessId: businessId,
              businessName: businessData.name,
              queueNumber: nextCustomer.queueNumber,
              joinedAt: nextCustomer.joinedAt,
              finishedAt: finishedAt,
              status: 'completed',
              userName: userName
            });
            
          // Send notification to user
          await NotificationService.sendQueueNotification(
            nextCustomer.userId,
            businessId,
            nextCustomer.queueNumber,
            'finished',
            {
              businessName: businessData.name,
              finishedAt: new Date().toISOString()
            }
          );
        } catch (userError) {
          console.error('Error updating user queue records:', userError);
          // Continue with the process even if updating user records fails
        }
      }

      Alert.alert('Success', `Customer ${nextCustomer.userName || 'Anonymous'} has been served.`);
    } catch (error) {
      console.error('Error serving customer:', error);
      Alert.alert('Error', 'Failed to serve customer.');
    }
  };

  const handleRemoveFromQueue = async (queueId, userId) => {
    try {
      // Get queue details before removing
      const queueDoc = await firestore()
        .collection('businesses')
        .doc(businessId)
        .collection('queues')
        .doc(queueId)
        .get();
      
      const queueData = queueDoc.exists ? queueDoc.data() : null;
      
      if (!queueData) {
        Alert.alert('Error', 'Queue not found');
        return;
      }
      
      // Update queue status to cancelled
      await firestore()
        .collection('businesses')
        .doc(businessId)
        .collection('queues')
        .doc(queueId)
        .update({
          status: 'cancelled',
          cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      // Remove from user's active queues and add to history
      if (userId) {
        try {
          // Find in user's active queues
          const userActiveQueueRef = await firestore()
            .collection('users')
            .doc(userId)
            .collection('activeQueues')
            .where('businessId', '==', businessId)
            .where('queueNumber', '==', queueData.queueNumber)
            .get();
          
          // Delete from active queues
          if (!userActiveQueueRef.empty) {
            await firestore()
              .collection('users')
              .doc(userId)
              .collection('activeQueues')
              .doc(userActiveQueueRef.docs[0].id)
              .delete();
          }
          
          // Add to user's queue history
          await firestore()
            .collection('users')
            .doc(userId)
            .collection('queueHistory')
            .add({
              businessId: businessId,
              businessName: businessData.name,
              queueNumber: queueData.queueNumber,
              joinedAt: queueData.joinedAt,
              cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
              status: 'cancelled',
              userName: queueData.userName || 'Anonymous'
            });
            
          // Send notification to user
          await NotificationService.sendQueueNotification(
            userId,
            businessId,
            queueData.queueNumber,
            'cancelled',
            {
              businessName: businessData.name,
              cancelledAt: new Date().toISOString()
            }
          );
        } catch (userError) {
          console.error('Error updating user queue records:', userError);
        }
      }

      Alert.alert('Success', 'Customer has been removed from the queue.');
    } catch (error) {
      console.error('Error removing customer:', error);
      Alert.alert('Error', 'Failed to remove customer.');
    }
  };

  const toggleBusinessStatus = async () => {
    if (!businessData || businessData.approvalStatus !== 'approved') {
      Alert.alert('Error', 'Your business must be approved before you can open it.');
      return;
    }
    
    try {
      const newStatus = businessData.status === 'open' ? 'closed' : 'open';
      await firestore()
        .collection('businesses')
        .doc(businessId)
        .update({
          status: newStatus,
        });
        
      setBusinessData({
        ...businessData,
        status: newStatus,
      });
      
      Alert.alert(
        'Status Updated', 
        `Your business is now ${newStatus === 'open' ? 'open' : 'closed'} for new queue entries.`
      );
    } catch (error) {
      console.error('Error updating business status:', error);
      Alert.alert('Error', 'Failed to update business status.');
    }
  };

  const renderQueueItem = ({ item, index }) => {
    const isFirst = index === 0;
    
    return (
      <View style={[styles.queueItem, { backgroundColor: theme.card }]}>
        <View style={[styles.queueNumberContainer, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.queueNumber, { color: theme.primary }]}>{item.queueNumber}</Text>
          {isFirst && (
            <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.currentBadgeText}>Next</Text>
            </View>
          )}
        </View>
        
        <View style={styles.customerInfo}>
          <Text style={[styles.customerName, { color: theme.text }]}>
            {item.userName || 'Anonymous'}
          </Text>
          {item.userEmail && (
            <Text style={[styles.customerEmail, { color: theme.secondaryText }]}>{item.userEmail}</Text>
          )}
          {item.joinedAt && (
            <Text style={[styles.joinedTime, { color: theme.secondaryText }]}>
              Joined {formatTimestamp(item.joinedAt)}
            </Text>
          )}
        </View>
        
        <View style={styles.actions}>
          {isFirst ? (
            <TouchableOpacity 
              style={[styles.serveButton, { backgroundColor: theme.primary }]}
              onPress={handleServeNext}
            >
              <Icon name="check" size={16} color="#fff" />
              <Text style={styles.serveButtonText}>Serve</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.removeButton, { borderColor: theme.error }]}
              onPress={() => handleRemoveFromQueue(item.id, item.userId)}
            >
              <Icon name="close" size={16} color={theme.error} />
              <Text style={[styles.removeButtonText, { color: theme.error }]}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Convert Firestore timestamp to JavaScript Date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      // Format time as HH:MM AM/PM
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>Loading queue...</Text>
      </View>
    );
  }

  // Check if business is approved
  if (businessData && businessData.approvalStatus !== 'approved') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <View style={styles.approvalWarning}>
            <Icon name="alert-circle-outline" size={40} color={theme.warning} />
            <Text style={[styles.approvalWarningTitle, { color: theme.text }]}>
              Business Not Approved
            </Text>
            <Text style={[styles.approvalWarningText, { color: theme.secondaryText }]}>
              Your business is pending approval by an administrator.
              You cannot manage queues until your business is approved.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <View style={styles.queueStats}>
          <View>
            <Text style={[styles.queueStatsText, { color: theme.secondaryText }]}>Active Queues</Text>
            <Text style={[styles.queueStatsNumber, { color: theme.primary }]}>{activeQueues.length}</Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.statusButton, 
              { 
                backgroundColor: businessData?.status === 'open' 
                  ? `${theme.success}20` 
                  : `${theme.error}20` 
              }
            ]}
            onPress={toggleBusinessStatus}
          >
            <View 
              style={[
                styles.statusIndicator, 
                { 
                  backgroundColor: businessData?.status === 'open' 
                    ? theme.success 
                    : theme.error 
                }
              ]} 
            />
            <Text 
              style={[
                styles.statusText, 
                { 
                  color: businessData?.status === 'open' 
                    ? theme.success 
                    : theme.error 
                }
              ]}
            >
              {businessData?.status === 'open' ? 'Open' : 'Closed'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {activeQueues.length > 0 ? (
          <TouchableOpacity 
            style={[styles.serveNextButton, { backgroundColor: theme.primary }]}
            onPress={handleServeNext}
          >
            <Icon name="account-check" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.serveNextButtonText}>Serve Next Customer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyQueueMessage}>
            <Text style={[styles.emptyQueueText, { color: theme.secondaryText }]}>
              No customers in queue
            </Text>
          </View>
        )}
      </View>
      
      <FlatList
        data={activeQueues}
        keyExtractor={item => item.id}
        renderItem={renderQueueItem}
        contentContainerStyle={styles.queueList}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
            <Icon name="account-group" size={60} color={theme.secondaryText} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Queue is Empty</Text>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              No customers are currently in your queue.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  queueStatsText: {
    fontSize: 16,
  },
  queueStatsNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  serveNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  serveNextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyQueueMessage: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyQueueText: {
    fontSize: 16,
  },
  queueList: {
    paddingBottom: 16,
  },
  queueItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  queueNumberContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  queueNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  currentBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  customerEmail: {
    fontSize: 14,
  },
  joinedTime: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    marginLeft: 8,
  },
  serveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    borderRadius: 16,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  approvalWarning: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  approvalWarningTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  approvalWarningText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default QueueManagement;
