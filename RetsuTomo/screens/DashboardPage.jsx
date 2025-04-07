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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';

export default function DashboardPage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [recentBusinesses, setRecentBusinesses] = useState([]);
  const [activeQueues, setActiveQueues] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        navigation.replace('LoginPage');
        return;
      }

      // Fetch user data
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        setUserData(userDoc.data());
      }

      // Fetch recent businesses
      const businessesSnapshot = await firestore
        .collection('businesses')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const businessesData = businessesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentBusinesses(businessesData);

      // Fetch active queues for the user
      const queuesSnapshot = await firestore
        .collection('queues')
        .where('userId', '==', user.uid)
        .where('status', 'in', ['waiting', 'current'])
        .get();

      const queuesData = [];
      for (const doc of queuesSnapshot.docs) {
        const queueData = doc.data();
        // Fetch business details for each queue
        if (queueData.businessId) {
          const businessDoc = await firestore.collection('businesses').doc(queueData.businessId).get();
          if (businessDoc.exists) {
            queuesData.push({
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
      setActiveQueues(queuesData);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: insets.top }]} edges={['top',  'bottom']}>
        <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]} edges={['top',  'bottom']}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.text }]}>
            Hello, {userData?.displayName || 'User'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Welcome to RetsuTomo
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.profileButton, { backgroundColor: theme.card }]} 
          onPress={() => navigation.navigate('ProfilePage')}
        >
          <Icon name="account" size={24} color={theme.primary} />
        </TouchableOpacity>
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
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate('BusinessListPage')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.primaryLight }]}>
                <Icon name="store" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Find Business</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate('MyQueuesPage')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.primaryLight }]}>
                <Icon name="ticket-outline" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>My Queues</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate('ManageBusinessesPage')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.primaryLight }]}>
                <Icon name="briefcase-outline" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Manage Business</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Queues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Active Queues</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyQueuesPage')}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {activeQueues.length > 0 ? (
            <View style={styles.queuesList}>
              {activeQueues.map((queue, index) => (
                <TouchableOpacity 
                  key={queue.id} 
                  style={[styles.queueCard, { backgroundColor: theme.card }]}
                  onPress={() => navigation.navigate('QueuePage', { 
                    businessId: queue.businessId,
                    businessName: queue.business?.name
                  })}
                >
                  <View style={styles.queueCardContent}>
                    <View style={[styles.queueIconContainer, { backgroundColor: theme.primaryLight }]}>
                      <Icon name="ticket-confirmation-outline" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.queueInfo}>
                      <Text style={[styles.businessName, { color: theme.text }]}>
                        {queue.business?.name || 'Business'}
                      </Text>
                      <View style={styles.queueMeta}>
                        <Text style={[styles.queuePosition, { color: theme.secondaryText }]}>
                          Position: {queue.position || 'Unknown'}
                        </Text>
                        <View style={[
                          styles.statusBadge, 
                          { backgroundColor: queue.status === 'current' ? theme.success : theme.warning }
                        ]}>
                          <Text style={styles.statusText}>
                            {queue.status === 'current' ? 'Your Turn' : 'Waiting'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color={theme.secondaryText} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyStateContainer, { backgroundColor: theme.card }]}>
              <Icon name="ticket-outline" size={40} color={theme.secondaryText} />
              <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
                You don't have any active queues
              </Text>
              <TouchableOpacity 
                style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('BusinessListPage')}
              >
                <Text style={styles.emptyStateButtonText}>Find a Business</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Businesses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Businesses</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BusinessListPage')}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentBusinesses.length > 0 ? (
            <View style={styles.businessesList}>
              {recentBusinesses.map((business) => (
                <TouchableOpacity 
                  key={business.id} 
                  style={[styles.businessCard, { backgroundColor: theme.card }]}
                  onPress={() => navigation.navigate('QueuePage', { 
                    businessId: business.id,
                    businessName: business.name
                  })}
                >
                  <View style={styles.businessCardContent}>
                    <View style={[styles.businessIconContainer, { backgroundColor: theme.primaryLight }]}>
                      <Icon name="store" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.businessInfo}>
                      <Text style={[styles.businessName, { color: theme.text }]}>
                        {business.name}
                      </Text>
                      <View style={styles.businessMeta}>
                        <View style={[styles.categoryBadge, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.categoryText, { color: theme.primary }]}>
                            {business.category || 'General'}
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
                  <Icon name="chevron-right" size={24} color={theme.secondaryText} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyStateContainer, { backgroundColor: theme.card }]}>
              <Icon name="store-outline" size={40} color={theme.secondaryText} />
              <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
                No businesses available
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
  greeting: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '31%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  queuesList: {
    gap: 12,
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
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  queuePosition: {
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
  businessesList: {
    gap: 12,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  businessCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '500',
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  emptyStateContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});