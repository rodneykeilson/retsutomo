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
  RefreshControl,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function OngoingQueues() {
  const navigation = useNavigation();
  const { theme } = useTheme();
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

      // Fetch active queues
      const activeSnapshot = await firestore
        .collection('users')
        .doc(user.uid)
        .collection('activeQueues')
        .get();

      const activeQueuesData = [];

      // Process active queues
      for (const doc of activeSnapshot.docs) {
        const queueData = doc.data();
        // Fetch business details
        if (queueData.businessId) {
          const businessDoc = await firestore.collection('businesses').doc(queueData.businessId).get();
          if (businessDoc.exists) {
            activeQueuesData.push({
              id: doc.id,
              ...queueData,
              business: {
                id: businessDoc.id,
                ...businessDoc.data()
              }
            });
          }
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
                .where('status', '==', 'active')
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
        <Text style={[styles.title, { color: theme.text }]}>My Queues</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={activeQueues}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.queueCard, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('QueuePage', { 
              businessId: item.businessId,
              businessName: item.business?.name
            })}
          >
            <View style={styles.queueCardContent}>
              <View style={[
                styles.queueIconContainer, 
                { 
                  backgroundColor: theme.primaryLight 
                }
              ]}>
                <Icon 
                  name="ticket-outline" 
                  size={24} 
                  color={theme.primary} 
                />
              </View>
              <View style={styles.queueInfo}>
                <Text style={[styles.businessName, { color: theme.text }]}>
                  {item.business?.name || 'Business'}
                </Text>
                <View style={styles.queueMeta}>
                  <View style={styles.queueDetails}>
                    <Text style={[styles.queuePosition, { color: theme.secondaryText }]}>
                      Position: #{item.position}
                    </Text>
                    <Text style={[styles.queueWaitTime, { color: theme.secondaryText }]}>
                      Est. wait: ~{item.estimatedWaitTime} min
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { 
                      backgroundColor: theme.warning 
                    }
                  ]}>
                    <Text style={styles.statusText}>
                      Waiting
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
          </TouchableOpacity>
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
    </SafeAreaView>
  );
}

function FinishedQueues() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyQueues, setHistoryQueues] = useState([]);

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

      // Fetch history queues
      const historySnapshot = await firestore
        .collectionGroup('queues')
        .where('userId', '==', user.uid)
        .where('status', 'in', ['finished', 'cancelled'])
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const historyQueuesData = [];

      // Process history queues
      for (const doc of historySnapshot.docs) {
        const queueData = doc.data();
        // Fetch business details
        if (queueData.businessId) {
          const businessDoc = await firestore.collection('businesses').doc(queueData.businessId).get();
          if (businessDoc.exists) {
            historyQueuesData.push({
              id: doc.id,
              ...queueData,
              business: {
                id: businessDoc.id,
                ...businessDoc.data()
              }
            });
          }
        }
      }

      setHistoryQueues(historyQueuesData);
    } catch (error) {
      console.error('Error fetching queues:', error);
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
        <Text style={[styles.title, { color: theme.text }]}>Queue History</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={historyQueues}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View 
            style={[styles.historyCard, { backgroundColor: theme.card }]}
          >
            <View style={styles.queueCardContent}>
              <View style={[
                styles.queueIconContainer, 
                { 
                  backgroundColor: item.status === 'completed' 
                    ? theme.success + '20' 
                    : theme.error + '20' 
                }
              ]}>
                <Icon 
                  name={item.status === 'completed' ? 'check-circle-outline' : 'close-circle-outline'} 
                  size={24} 
                  color={item.status === 'completed' ? theme.success : theme.error} 
                />
              </View>
              <View style={styles.queueInfo}>
                <Text style={[styles.businessName, { color: theme.text }]}>
                  {item.business?.name || 'Business'}
                </Text>
                <View style={styles.historyMeta}>
                  <Text style={[styles.historyDate, { color: theme.secondaryText }]}>
                    {item.joinedAt?.toDate().toLocaleDateString()}
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
    </SafeAreaView>
  );
}

export default function MyQueuesPage() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          elevation: 8,
        },
        tabBarActiveTintColor: '#56409e',
        tabBarInactiveTintColor: '#9992a7',
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
});