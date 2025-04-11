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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';

export default function AdminDashboardPage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingBusinesses, setPendingBusinesses] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigation.replace('LoginPage');
        return;
      }

      // Check if user is an admin
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data().role === 'admin') {
        setAdminData(userDoc.data());
        fetchPendingBusinesses();
      } else {
        // Not an admin, redirect to regular dashboard
        Alert.alert('Access Denied', 'You do not have admin privileges.');
        navigation.replace('MainApp');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify admin status');
    }
  };

  const fetchPendingBusinesses = async () => {
    try {
      setLoading(true);
      
      // Fetch businesses with pending status
      const businessesSnapshot = await firestore
        .collection('businesses')
        .where('approvalStatus', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const businessesData = businessesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPendingBusinesses(businessesData);
    } catch (error) {
      console.error('Error fetching pending businesses:', error);
      Alert.alert('Error', 'Failed to load pending businesses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingBusinesses();
  };

  const handleApproveBusiness = async (businessId) => {
    try {
      await firestore.collection('businesses').doc(businessId).update({
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: auth.currentUser.uid
      });
      
      // Remove from the pending list
      setPendingBusinesses(prevList => 
        prevList.filter(business => business.id !== businessId)
      );
      
      Alert.alert('Success', 'Business has been approved');
    } catch (error) {
      console.error('Error approving business:', error);
      Alert.alert('Error', 'Failed to approve business');
    }
  };

  const handleRejectBusiness = async (businessId) => {
    try {
      await firestore.collection('businesses').doc(businessId).update({
        approvalStatus: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: auth.currentUser.uid
      });
      
      // Remove from the pending list
      setPendingBusinesses(prevList => 
        prevList.filter(business => business.id !== businessId)
      );
      
      Alert.alert('Success', 'Business has been rejected');
    } catch (error) {
      console.error('Error rejecting business:', error);
      Alert.alert('Error', 'Failed to reject business');
    }
  };

  const renderBusinessItem = ({ item }) => {
    const firstLetter = item.name ? item.name.charAt(0).toUpperCase() : '?';
    const randomColor = getRandomColor(item.id);
    
    return (
      <View style={[styles.businessCard, { backgroundColor: theme.card }]}>
        <View style={styles.businessCardContent}>
          <View style={[styles.businessIconContainer, { backgroundColor: randomColor }]}>
            <Text style={styles.businessIconText}>{firstLetter}</Text>
          </View>
          <View style={styles.businessInfo}>
            <Text style={[styles.businessName, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.businessMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.categoryText, { color: theme.primary }]}>{item.category || 'Other'}</Text>
              </View>
              <Text style={[styles.businessDate, { color: theme.secondaryText }]}>
                {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Unknown date'}
              </Text>
            </View>
            <Text style={[styles.ownerInfo, { color: theme.secondaryText }]}>
              Owner: {item.ownerName || 'Unknown'}
            </Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.approveButton, { backgroundColor: theme.success }]}
            onPress={() => handleApproveBusiness(item.id)}
          >
            <Icon name="check" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.rejectButton, { backgroundColor: theme.error }]}
            onPress={() => handleRejectBusiness(item.id)}
          >
            <Icon name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Generate a consistent color based on business ID
  const getRandomColor = (id) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#6B5CA5', '#61C0BF', '#FF9A76', '#A5DEE5'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]} edges={['top']}>
        <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.text }]}>
            Admin Dashboard
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Manage business approvals
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.profileButton, { backgroundColor: theme.card }]} 
          onPress={() => navigation.navigate('ProfilePage')}
        >
          <Icon name="account" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab, { backgroundColor: theme.card }]}
          onPress={() => setActiveTab('pending')}
        >
          <Icon 
            name="clock-outline" 
            size={20} 
            color={activeTab === 'pending' ? theme.primary : theme.secondaryText}
            style={styles.tabIcon}
          />
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'pending' && styles.activeTabText,
              { color: activeTab === 'pending' ? theme.primary : theme.secondaryText }
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={pendingBusinesses}
        renderItem={renderBusinessItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.businessList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyStateContainer, { backgroundColor: theme.card }]}>
            <Icon name="store-check-outline" size={40} color={theme.secondaryText} />
            <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
              No pending businesses to approve
            </Text>
          </View>
        }
      />
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#f0eeff',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#56409e',
  },
  businessList: {
    padding: 16,
  },
  businessCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  businessCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
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
  businessDate: {
    fontSize: 12,
  },
  ownerInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
});
