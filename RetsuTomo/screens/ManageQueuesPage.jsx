import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';

export default function ManageQueuesPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { businessId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [business, setBusiness] = useState(null);
  const [queues, setQueues] = useState([]);
  const [isBusinessOpen, setIsBusinessOpen] = useState(false);

  useEffect(() => {
    fetchBusinessData();
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        navigation.replace('LoginPage');
        return;
      }

      if (!businessId) {
        // If no business ID is provided, fetch the first business owned by the user
        const businessesSnapshot = await firestore
          .collection('businesses')
          .where('ownerId', '==', user.uid)
          .limit(1)
          .get();

        if (businessesSnapshot.empty) {
          Alert.alert(
            'No Business Found',
            'You don\'t have any businesses yet. Create one first.',
            [
              {
                text: 'Create Business',
                onPress: () => navigation.navigate('ManageBusinessesPage')
              }
            ]
          );
          setLoading(false);
          return;
        }

        const businessData = {
          id: businessesSnapshot.docs[0].id,
          ...businessesSnapshot.docs[0].data()
        };
        
        setBusiness(businessData);
        setIsBusinessOpen(businessData.status === 'open');
        
        // Fetch queues for this business
        await fetchQueues(businessesSnapshot.docs[0].id);
      } else {
        // Fetch the specified business
        const businessDoc = await firestore.collection('businesses').doc(businessId).get();
        
        if (!businessDoc.exists) {
          Alert.alert('Error', 'Business not found');
          navigation.goBack();
          return;
        }
        
        const businessData = {
          id: businessDoc.id,
          ...businessDoc.data()
        };
        
        // Verify that the current user is the owner
        if (businessData.ownerId !== user.uid) {
          Alert.alert('Access Denied', 'You do not have permission to manage this business');
          navigation.goBack();
          return;
        }
        
        setBusiness(businessData);
        setIsBusinessOpen(businessData.status === 'open');
        
        // Fetch queues for this business
        await fetchQueues(businessId);
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchQueues = async (businessId) => {
    try {
      // Fetch active queues for this business
      const queuesSnapshot = await firestore
        .collection('queues')
        .where('businessId', '==', businessId)
        .where('status', 'in', ['waiting', 'current'])
        .orderBy('position', 'asc')
        .get();

      const queuesData = [];
      for (const doc of queuesSnapshot.docs) {
        const queueData = doc.data();
        
        // Fetch user details for each queue
        if (queueData.userId) {
          const userDoc = await firestore.collection('users').doc(queueData.userId).get();
          if (userDoc.exists) {
            queuesData.push({
              id: doc.id,
              ...queueData,
              user: {
                id: userDoc.id,
                ...userDoc.data()
              }
            });
          } else {
            queuesData.push({
              id: doc.id,
              ...queueData,
              user: {
                displayName: 'Unknown User'
              }
            });
          }
        }
      }
      
      setQueues(queuesData);
    } catch (error) {
      console.error('Error fetching queues:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleBusinessStatus = async () => {
    try {
      if (!business) return;
      
      const newStatus = !isBusinessOpen;
      setIsBusinessOpen(newStatus);
      
      await firestore.collection('businesses').doc(business.id).update({
        status: newStatus ? 'open' : 'closed'
      });
      
      setBusiness({
        ...business,
        status: newStatus ? 'open' : 'closed'
      });
      
      Alert.alert(
        'Status Updated',
        `Your business is now ${newStatus ? 'open' : 'closed'} for new queue entries`
      );
    } catch (error) {
      console.error('Error updating business status:', error);
      Alert.alert('Error', error.message);
      // Revert the switch state on error
      setIsBusinessOpen(!isBusinessOpen);
    }
  };

  const handleServeNext = async () => {
    try {
      if (!business || queues.length === 0) return;
      
      // Find the current queue being served
      const currentQueue = queues.find(q => q.status === 'current');
      
      if (currentQueue) {
        // Mark the current queue as completed
        await firestore.collection('queues').doc(currentQueue.id).update({
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      // Find the next queue in line
      const nextQueue = queues.find(q => q.status === 'waiting');
      
      if (nextQueue) {
        // Update the next queue to current
        await firestore.collection('queues').doc(nextQueue.id).update({
          status: 'current',
          startedAt: new Date()
        });
        
        Alert.alert('Next Customer', `Now serving ${nextQueue.user?.displayName || 'Customer'}`);
      } else {
        Alert.alert('Queue Empty', 'There are no more customers in the queue');
      }
      
      // Refresh the queue list
      await fetchQueues(business.id);
    } catch (error) {
      console.error('Error serving next customer:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleRemoveFromQueue = async (queueId) => {
    try {
      Alert.alert(
        'Remove from Queue',
        'Are you sure you want to remove this customer from the queue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await firestore.collection('queues').doc(queueId).update({
                status: 'cancelled',
                cancelledAt: new Date()
              });
              
              // Refresh the queue list
              await fetchQueues(business.id);
              
              Alert.alert('Success', 'Customer has been removed from the queue');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error removing customer from queue:', error);
      Alert.alert('Error', error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBusinessData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.card }]} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Manage Queue</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {business && (
          <View style={[styles.businessCard, { backgroundColor: theme.card }]}>
            <View style={styles.businessHeader}>
              <View style={[styles.businessIconContainer, { backgroundColor: theme.primaryLight }]}>
                <Icon name="store" size={24} color={theme.primary} />
              </View>
              <View style={styles.businessInfo}>
                <Text style={[styles.businessName, { color: theme.text }]}>Your Business</Text>
                <View style={styles.businessMeta}>
                  <View style={[styles.categoryBadge, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.categoryText, { color: theme.primary }]}>
                      General
                    </Text>
                  </View>
                  <Text style={[
                    styles.statusText, 
                    { color: business.status === 'open' ? theme.success : theme.error }
                  ]}>
                    {business.status === 'open' ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.businessControls}>
              <View style={styles.businessControlItem}>
                <Text style={[styles.businessControlLabel, { color: theme.text }]}>
                  Accept New Queues
                </Text>
                <Switch
                  value={isBusinessOpen}
                  onValueChange={handleToggleBusinessStatus}
                  trackColor={{ false: theme.isDarkMode ? '#555' : '#e0e0e0', true: theme.primary }}
                  thumbColor={theme.card}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.serveNextButton, { backgroundColor: theme.primary }]}
                onPress={handleServeNext}
                disabled={queues.length === 0}
              >
                <Text style={styles.serveNextButtonText}>
                  {queues.find(q => q.status === 'current') 
                    ? 'Complete Current & Serve Next' 
                    : 'Serve Next Customer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Current Queue {queues.length > 0 ? `(${queues.length})` : ''}
          </Text>

          {queues.length > 0 ? (
            <View style={styles.queuesList}>
              {queues.map((queue) => (
                <View 
                  key={queue.id} 
                  style={[
                    styles.queueCard, 
                    { 
                      backgroundColor: theme.card,
                      borderLeftColor: queue.status === 'current' ? theme.success : theme.primary,
                    }
                  ]}
                >
                  <View style={styles.queueCardContent}>
                    <View style={[
                      styles.queuePosition, 
                      { 
                        backgroundColor: queue.status === 'current' 
                          ? theme.success 
                          : theme.primary 
                      }
                    ]}>
                      <Text style={styles.queuePositionText}>
                        {queue.status === 'current' ? 'Now' : queue.position}
                      </Text>
                    </View>
                    <View style={styles.queueInfo}>
                      <Text style={[styles.queueCustomerName, { color: theme.text }]}>
                        {queue.user?.displayName || 'Customer'}
                      </Text>
                      <View style={styles.queueMeta}>
                        <Text style={[styles.queueJoinedTime, { color: theme.secondaryText }]}>
                          Joined: {queue.joinedAt?.toDate().toLocaleTimeString()}
                        </Text>
                        <View style={[
                          styles.statusBadge, 
                          { 
                            backgroundColor: queue.status === 'current' 
                              ? theme.success 
                              : theme.warning 
                          }
                        ]}>
                          <Text style={styles.statusBadgeText}>
                            {queue.status === 'current' ? 'Current' : 'Waiting'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.removeButton, { backgroundColor: theme.error + '20' }]}
                    onPress={() => handleRemoveFromQueue(queue.id)}
                  >
                    <Icon name="close" size={20} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyStateContainer, { backgroundColor: theme.card }]}>
              <Icon name="ticket-outline" size={40} color={theme.secondaryText} />
              <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
                No customers in queue
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.secondaryText }]}>
                Your queue is open and ready for customers
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  businessCard: {
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  businessHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  businessIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  businessControls: {
    marginTop: 8,
  },
  businessControlItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessControlLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  serveNextButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  serveNextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  queuesList: {
    gap: 12,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  queueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  queuePosition: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  queuePositionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  queueInfo: {
    flex: 1,
  },
  queueCustomerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  queueJoinedTime: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyStateContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});