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
import { firestore, auth } from '../services/firebase';
import { firebase } from '@react-native-firebase/app';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const QueueManagement = ({ businessId }) => {
  const [activeQueues, setActiveQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    if (!businessId) return;

    // Fetch business details
    const fetchBusinessDetails = async () => {
      try {
        const businessDoc = await firestore.collection('businesses').doc(businessId).get();
        if (businessDoc.exists) {
          setBusiness(businessDoc.data());
        }
      } catch (error) {
        console.error('Error fetching business details:', error);
      }
    };

    fetchBusinessDetails();

    // Set up real-time listener for queues
    const unsubscribe = firestore
      .collection('businesses')
      .doc(businessId)
      .collection('queues')
      .where('status', '==', 'active')
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
  }, [businessId]);

  const handleServeNext = async () => {
    if (activeQueues.length === 0) {
      Alert.alert('No customers', 'There are no customers in the queue.');
      return;
    }

    try {
      const nextCustomer = activeQueues[0];
      
      // Update the queue status to finished
      await firestore
        .collection('businesses')
        .doc(businessId)
        .collection('queues')
        .doc(nextCustomer.id)
        .update({
          status: 'finished',
          finishedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert('Success', `Customer ${nextCustomer.userName || 'Anonymous'} has been served.`);
    } catch (error) {
      console.error('Error serving customer:', error);
      Alert.alert('Error', 'Failed to serve customer.');
    }
  };

  const handleRemoveFromQueue = (queueId, userName) => {
    Alert.alert(
      'Remove Customer',
      `Are you sure you want to remove ${userName || 'this customer'} from the queue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .doc(queueId)
                .update({
                  status: 'cancelled',
                  cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            } catch (error) {
              console.error('Error removing customer:', error);
              Alert.alert('Error', 'Failed to remove customer from queue.');
            }
          },
        },
      ]
    );
  };

  const toggleBusinessStatus = async () => {
    if (!business) return;
    
    try {
      const newStatus = business.status === 'open' ? 'closed' : 'open';
      await firestore
        .collection('businesses')
        .doc(businessId)
        .update({
          status: newStatus,
        });
        
      setBusiness({
        ...business,
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

  const renderQueueItem = ({ item, index }) => (
    <View style={styles.queueItem}>
      <View style={styles.queueNumberContainer}>
        <Text style={styles.queueNumber}>{item.queueNumber}</Text>
        {index === 0 && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </View>
      
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.userName || 'Anonymous'}</Text>
        <Text style={styles.customerEmail}>{item.userEmail || 'No email provided'}</Text>
        <Text style={styles.joinedTime}>
          Joined: {formatTimestamp(item.createdAt)}
        </Text>
      </View>
      
      <View style={styles.actions}>
        {index === 0 ? (
          <TouchableOpacity
            style={styles.serveButton}
            onPress={handleServeNext}
          >
            <Icon name="check-circle-outline" size={20} color="#fff" />
            <Text style={styles.serveButtonText}>Serve</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFromQueue(item.id, item.userName)}
          >
            <Icon name="close-circle-outline" size={20} color="#f44336" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#56409e" />
        <Text style={styles.loadingText}>Loading queue data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.queueStats}>
          <Text style={styles.queueStatsText}>
            <Text style={styles.queueStatsNumber}>{activeQueues.length}</Text> customers in queue
          </Text>
          {business && (
            <TouchableOpacity
              style={[
                styles.statusButton,
                { backgroundColor: business.status === 'open' ? '#e8f5e9' : '#ffebee' }
              ]}
              onPress={toggleBusinessStatus}
            >
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: business.status === 'open' ? '#43A047' : '#F44336' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: business.status === 'open' ? '#2E7D32' : '#C62828' }
              ]}>
                {business.status === 'open' ? 'Open' : 'Closed'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {activeQueues.length > 0 ? (
          <TouchableOpacity
            style={styles.serveNextButton}
            onPress={handleServeNext}
          >
            <Icon name="account-check" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.serveNextButtonText}>Serve Next Customer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyQueueMessage}>
            <Text style={styles.emptyQueueText}>No customers in queue</Text>
          </View>
        )}
      </View>
      
      <FlatList
        data={activeQueues}
        keyExtractor={item => item.id}
        renderItem={renderQueueItem}
        contentContainerStyle={styles.queueList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-group" size={60} color="#d8dffe" />
            <Text style={styles.emptyTitle}>Queue is Empty</Text>
            <Text style={styles.emptyText}>
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
    color: '#56409e',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#fff',
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
    color: '#281b52',
  },
  queueStatsNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#56409e',
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
    backgroundColor: '#56409e',
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
    color: '#9992a7',
    fontSize: 16,
  },
  queueList: {
    paddingBottom: 16,
  },
  queueItem: {
    backgroundColor: '#fff',
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
    backgroundColor: '#f0eeff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  queueNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#56409e',
  },
  currentBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#56409e',
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
    color: '#281b52',
  },
  customerEmail: {
    fontSize: 14,
    color: '#9992a7',
  },
  joinedTime: {
    fontSize: 12,
    color: '#9992a7',
    marginTop: 4,
  },
  actions: {
    marginLeft: 8,
  },
  serveButton: {
    backgroundColor: '#56409e',
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
    borderColor: '#f44336',
  },
  removeButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#281b52',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9992a7',
    textAlign: 'center',
  },
});

export default QueueManagement;
