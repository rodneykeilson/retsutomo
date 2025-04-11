import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function OngoingQueues() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeQueues, setActiveQueues] = useState([]);
  const [businessData, setBusinessData] = useState({});

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        navigation.replace('LoginPage');
        return;
      }

      // Fetch active queues from user's collection
      const activeSnapshot = await firestore
        .collection('users')
        .doc(user.uid)
        .collection('activeQueues')
        .get();

      // Also check business queues to verify they're still active
      const businessQueueIds = [];
      const activeQueuesData = [];

      // First, collect all business queue IDs and data from user's active queues
      for (const doc of activeSnapshot.docs) {
        const queueData = doc.data();
        if (queueData.businessId) {
          businessQueueIds.push({
            businessId: queueData.businessId,
            queueNumber: queueData.queueNumber,
            docId: doc.id,
            data: queueData
          });
        }
      }

      // Verify each queue is still active in the business collection
      for (const queueInfo of businessQueueIds) {
        try {
          // Check if this queue is still active in the business collection
          const businessQueueSnapshot = await firestore
            .collection('businesses')
            .doc(queueInfo.businessId)
            .collection('queues')
            .where('userId', '==', user.uid)
            .where('queueNumber', '==', queueInfo.queueNumber)
            .get();

          let isActive = false;
          let businessQueueData = null;

          // Check if any of the matching queues are active
          for (const bDoc of businessQueueSnapshot.docs) {
            const bData = bDoc.data();
            if (bData.status === 'active' || bData.status === 'waiting' || bData.status === 'current') {
              isActive = true;
              businessQueueData = bData;
              break;
            }
          }

          // If the queue is no longer active in the business collection, remove it from user's active queues
          if (!isActive) {
            console.log(`Queue ${queueInfo.queueNumber} for business ${queueInfo.businessId} is no longer active, removing from user's active queues`);
            await firestore
              .collection('users')
              .doc(user.uid)
              .collection('activeQueues')
              .doc(queueInfo.docId)
              .delete();
            continue;
          }

          // Fetch business details
          const businessDoc = await firestore.collection('businesses').doc(queueInfo.businessId).get();
          if (businessDoc.exists) {
            activeQueuesData.push({
              id: queueInfo.docId,
              ...queueInfo.data,
              // Update with latest data from business queue if available
              ...(businessQueueData && { status: businessQueueData.status }),
              business: {
                id: businessDoc.id,
                ...businessDoc.data()
              }
            });
          }
        } catch (error) {
          console.error(`Error verifying queue ${queueInfo.queueNumber} for business ${queueInfo.businessId}:`, error);
        }
      }

      setActiveQueues(activeQueuesData);
      setBusinessData(activeQueuesData.reduce((acc, queue) => ({ ...acc, [queue.businessId]: queue.business }), {}));
    } catch (error) {
      console.error('Error fetching queues:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLeaveQueue = async (queueId, businessId, queueNumber) => {
    try {
      Alert.alert(
        'Leave Queue',
        'Are you sure you want to leave this queue?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .where('userId', '==', auth.currentUser.uid)
                .where('queueNumber', '==', queueNumber)
                .where('status', 'in', ['active', 'waiting', 'current'])
                .get()
                .then(snapshot => {
                  if (!snapshot.empty) {
                    snapshot.docs[0].ref.update({
                      status: 'cancelled',
                      leftAt: new Date()
                    });
                  }
                });
              
              // Remove from user's active queues
              await firestore
                .collection('users')
                .doc(auth.currentUser.uid)
                .collection('activeQueues')
                .doc(queueId)
                .delete();
              
              // Refresh the queue list
              fetchQueues();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error leaving queue:', error);
      Alert.alert('Error', error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueues();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 16 }}>Loading your queues...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>My Active Queues</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={activeQueues}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
            <Icon name="ticket-off" size={60} color={theme.secondaryText} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active Queues</Text>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              You are not currently in any queues.
            </Text>
            <TouchableOpacity 
              style={[styles.browseButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('BusinessListPage')}
            >
              <Text style={styles.browseButtonText}>Browse Businesses</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.queueCard, { backgroundColor: theme.card }]}>
            <View style={styles.queueCardContent}>
              <View 
                style={[
                  styles.queueIconContainer, 
                  { backgroundColor: item.business?.color || theme.primaryLight }
                ]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {item.business?.name?.charAt(0) || '?'}
                </Text>
              </View>
              
              <View style={styles.queueInfo}>
                <Text style={[styles.businessName, { color: theme.text }]}>
                  {item.business?.name || 'Unknown Business'}
                </Text>
                
                <View style={styles.queueMeta}>
                  <View style={styles.queueDetails}>
                    <Text style={[styles.queuePosition, { color: theme.secondaryText }]}>
                      Queue #{item.queueNumber}
                    </Text>
                    <Text style={[styles.queueWaitTime, { color: theme.secondaryText }]}>
                      Est. wait: {item.business?.estimatedTimePerCustomer * (item.queueNumber - 1)} mins
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.leaveButton, { backgroundColor: theme.error + '20' }]}
              onPress={() => handleLeaveQueue(item.id, item.businessId, item.queueNumber)}
            >
              <Icon name="close" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      />
    </View>
  );
}

function FinishedQueues() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finishedQueues, setFinishedQueues] = useState([]);
  const [businessData, setBusinessData] = useState({});

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        navigation.replace('LoginPage');
        return;
      }

      // Fetch finished queues - increase limit to show more history
      const finishedSnapshot = await firestore
        .collection('users')
        .doc(user.uid)
        .collection('queueHistory')
        .orderBy('joinedAt', 'desc')
        .limit(50) // Increased from 20 to 50
        .get();

      // Also check business queues for finished entries that might not be in history
      const businessQueuesSnapshot = await firestore
        .collectionGroup('queues')
        .where('userId', '==', user.uid)
        .where('status', 'in', ['finished', 'completed'])
        .orderBy('joinedAt', 'desc')
        .limit(50) // Increased from 20 to 50
        .get();

      const finishedQueuesData = [];
      const processedQueueIds = new Set();

      // Process finished queues from history
      for (const doc of finishedSnapshot.docs) {
        const queueData = doc.data();
        // Create a unique key for this queue - include timestamp to differentiate multiple visits to same business
        const joinedTimestamp = queueData.joinedAt && typeof queueData.joinedAt.toDate === 'function' 
          ? queueData.joinedAt.toDate().getTime() 
          : (queueData.joinedAt instanceof Date ? queueData.joinedAt.getTime() : 0);
        const queueKey = `${queueData.businessId}_${queueData.queueNumber}_${joinedTimestamp}`;
        
        // Skip if we already processed this queue
        if (processedQueueIds.has(queueKey)) continue;
        
        processedQueueIds.add(queueKey);
        
        // Fetch business details
        if (queueData.businessId) {
          try {
            const businessDoc = await firestore.collection('businesses').doc(queueData.businessId).get();
            if (businessDoc.exists) {
              finishedQueuesData.push({
                id: doc.id,
                ...queueData,
                business: {
                  id: businessDoc.id,
                  ...businessDoc.data()
                }
              });
            }
          } catch (error) {
            console.error('Error fetching business for queue history:', error);
            // Add queue even if business fetch fails
            finishedQueuesData.push({
              id: doc.id,
              ...queueData,
              business: { name: queueData.businessName || 'Unknown Business' }
            });
          }
        }
      }

      // Process finished queues from business queues that aren't in history
      for (const doc of businessQueuesSnapshot.docs) {
        const queueData = doc.data();
        
        // Get business path from reference
        const businessPath = doc.ref.parent.parent.path;
        const businessId = businessPath.split('/').pop();
        
        // Create a unique key for this queue - include timestamp to differentiate multiple visits to same business
        const joinedTimestamp = queueData.joinedAt && typeof queueData.joinedAt.toDate === 'function' 
          ? queueData.joinedAt.toDate().getTime() 
          : (queueData.joinedAt instanceof Date ? queueData.joinedAt.getTime() : 0);
        const queueKey = `${businessId}_${queueData.queueNumber}_${joinedTimestamp}`;
        
        // Skip if we already processed this queue
        if (processedQueueIds.has(queueKey)) continue;
        
        processedQueueIds.add(queueKey);
        
        try {
          // Add to user's queue history for future reference
          await firestore
            .collection('users')
            .doc(user.uid)
            .collection('queueHistory')
            .add({
              businessId: businessId,
              businessName: queueData.businessName || 'Unknown Business',
              queueNumber: queueData.queueNumber,
              joinedAt: queueData.joinedAt,
              finishedAt: queueData.finishedAt || new Date(),
              status: 'completed',
              userName: user.displayName || queueData.userName || 'Anonymous'
            });
          
          // Fetch business details
          const businessDoc = await firestore.collection('businesses').doc(businessId).get();
          if (businessDoc.exists) {
            finishedQueuesData.push({
              id: doc.id,
              ...queueData,
              businessId: businessId,
              status: 'completed',
              userName: user.displayName || queueData.userName || 'Anonymous',
              business: {
                id: businessId,
                ...businessDoc.data()
              }
            });
          }
        } catch (error) {
          console.error('Error processing finished queue:', error);
          // Add queue even if processing fails
          finishedQueuesData.push({
            id: doc.id,
            ...queueData,
            businessId: businessId,
            status: 'completed',
            userName: user.displayName || queueData.userName || 'Anonymous',
            business: { name: queueData.businessName || 'Unknown Business' }
          });
        }
      }

      // Sort by joined date (newest first)
      finishedQueuesData.sort((a, b) => {
        const dateA = a.joinedAt && typeof a.joinedAt.toDate === 'function' ? a.joinedAt.toDate() : new Date(a.joinedAt);
        const dateB = b.joinedAt && typeof b.joinedAt.toDate === 'function' ? b.joinedAt.toDate() : new Date(b.joinedAt);
        return dateB - dateA;
      });

      // Log the number of finished queues found
      console.log(`Found ${finishedQueuesData.length} finished queues`);
      
      setFinishedQueues(finishedQueuesData);
    } catch (error) {
      console.error('Error fetching queue history:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueues();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 16 }}>Loading your queue history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Queue History</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={finishedQueues}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
            <Icon name="history" size={60} color={theme.secondaryText} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Queue History</Text>
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
              You haven't joined any queues yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.historyCard, { backgroundColor: theme.card }]}>
            <View style={styles.queueCardContent}>
              <View 
                style={[
                  styles.queueIconContainer, 
                  { backgroundColor: item.business?.color || theme.primaryLight }
                ]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {item.business?.name?.charAt(0) || '?'}
                </Text>
              </View>
              
              <View style={styles.queueInfo}>
                <Text style={[styles.businessName, { color: theme.text }]}>
                  {item.business?.name || 'Unknown Business'}
                </Text>
                
                <View style={styles.historyMeta}>
                  <Text style={[styles.historyDate, { color: theme.secondaryText }]}>
                    {item.joinedAt && typeof item.joinedAt.toDate === 'function' 
                      ? item.joinedAt.toDate().toLocaleString() 
                      : item.joinedAt instanceof Date 
                        ? item.joinedAt.toLocaleString()
                        : 'Unknown date'}
                  </Text>
                  
                  <View style={[
                    styles.statusBadge, 
                    { 
                      backgroundColor: item.status === 'completed' 
                        ? theme.success 
                        : theme.error 
                    }
                  ]}>
                    <Text style={styles.statusText}>
                      {item.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      />
    </View>
  );
}

export default function MyQueuesPage() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { 
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            elevation: 8,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.secondaryText,
        }}
      >
        <Tab.Screen
          name="Ongoing"
          component={OngoingQueues}
          options={{
            tabBarLabel: 'Active',
            tabBarIcon: ({ color, size }) => (
              <Icon name="ticket-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Finished"
          component={FinishedQueues}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => (
              <Icon name="history" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
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
  list: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  queueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  queueIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  queueInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueDetails: {
  },
  queuePosition: {
    fontSize: 14,
  },
  queueWaitTime: {
    fontSize: 12,
    marginTop: 2,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDate: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  leaveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    marginHorizontal: 16,
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
    marginBottom: 16,
  },
  browseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});