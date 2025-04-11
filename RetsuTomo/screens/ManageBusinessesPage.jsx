import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Switch,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import QueueManagement from '../components/QueueManagement';
import BusinessDetailsForm from '../components/BusinessDetailsForm';
import sampleDataService from '../services/sampleData';

export default function ManageBusinessesPage({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchUserBusinesses();
  }, []);

  const fetchUserBusinesses = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to manage businesses.');
        return;
      }

      // Fetch all businesses owned by the user
      const businessSnapshot = await firestore
        .collection('businesses')
        .where('ownerId', '==', user.uid)
        .get();

      const businessesData = businessSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setBusinesses(businessesData);
      
      // If there are businesses, select the first one by default
      if (businessesData.length > 0) {
        setSelectedBusiness(businessesData[0]);
        setSelectedBusinessId(businessesData[0].id);
        setBusinessName(businessesData[0].name || '');
        setBusinessDescription(businessesData[0].description || '');
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBusiness = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    try {
      setCreatingBusiness(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to register a business.');
        return;
      }

      // Check if the business name already exists for this user
      const existingBusinessSnapshot = await firestore
        .collection('businesses')
        .where('ownerId', '==', user.uid)
        .where('name', '==', businessName.trim())
        .get();

      if (!existingBusinessSnapshot.empty) {
        Alert.alert('Error', 'You already have a business with this name. Please choose a different name.');
        setCreatingBusiness(false);
        return;
      }

      // Get user profile data for owner name
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      // Add the business to the `businesses` collection
      const businessData = {
        name: businessName.trim(),
        description: businessDescription.trim(),
        ownerId: user.uid,
        ownerName: userData.displayName || 'Unknown',
        category: 'Other',
        status: 'closed', // Business starts as closed until approved
        approvalStatus: 'pending', // New field for approval workflow
        estimatedTimePerCustomer: 15,
        maxQueueSize: 20,
        createdAt: new Date(),
      };

      const businessRef = await firestore.collection('businesses').add(businessData);
      
      // Add the new business to the list and select it
      const newBusiness = {
        id: businessRef.id,
        ...businessData
      };
      
      setBusinesses(prevBusinesses => [newBusiness, ...prevBusinesses]);
      setSelectedBusiness(newBusiness);
      setSelectedBusinessId(newBusiness.id);
      setBusinessName('');
      setBusinessDescription('');
      setShowCreateForm(false);
      
      Alert.alert(
        'Business Registered', 
        'Your business has been registered and is pending approval by an administrator.'
      );
    } catch (error) {
      console.error('Error registering business:', error);
      Alert.alert('Error', error.message);
    } finally {
      setCreatingBusiness(false);
    }
  };

  const handleCreateSampleBusiness = async () => {
    try {
      setCreatingBusiness(true);
      const createdBusinessId = await sampleDataService.createSampleBusinessForUser();
      
      if (createdBusinessId) {
        const businessDoc = await firestore.collection('businesses').doc(createdBusinessId).get();
        if (businessDoc.exists) {
          const newBusiness = {
            id: createdBusinessId,
            ...businessDoc.data()
          };
          
          setBusinesses(prevBusinesses => [...prevBusinesses, newBusiness]);
          setSelectedBusiness(newBusiness);
          setSelectedBusinessId(createdBusinessId);
          setBusinessName(newBusiness.name || '');
          setBusinessDescription(newBusiness.description || '');
          setShowCreateForm(false);
          
          Alert.alert('Success', 'Sample business created successfully!');
        }
      }
    } catch (error) {
      console.error('Error creating sample business:', error);
      Alert.alert('Error', 'Failed to create sample business');
    } finally {
      setCreatingBusiness(false);
    }
  };

  const handleBusinessUpdate = (updatedBusiness) => {
    // Update the selected business
    setSelectedBusiness(updatedBusiness);
    
    // Update the business in the businesses array
    setBusinesses(prevBusinesses => 
      prevBusinesses.map(business => 
        business.id === updatedBusiness.id ? updatedBusiness : business
      )
    );
  };

  const handleSelectBusiness = (business) => {
    setSelectedBusiness(business);
    setSelectedBusinessId(business.id);
    setBusinessName(business.name || '');
    setBusinessDescription(business.description || '');
    setActiveTab('queue'); // Reset to queue tab when switching businesses
  };

  const handleDeleteBusiness = (businessId) => {
    Alert.alert(
      'Delete Business',
      'Are you sure you want to delete this business? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete the business document
              await firestore.collection('businesses').doc(businessId).delete();
              
              // Remove from local state
              const updatedBusinesses = businesses.filter(b => b.id !== businessId);
              setBusinesses(updatedBusinesses);
              
              // If there are still businesses, select the first one
              if (updatedBusinesses.length > 0) {
                setSelectedBusiness(updatedBusinesses[0]);
                setSelectedBusinessId(updatedBusinesses[0].id);
                setBusinessName(updatedBusinesses[0].name || '');
                setBusinessDescription(updatedBusinesses[0].description || '');
              } else {
                setSelectedBusiness(null);
                setSelectedBusinessId(null);
                setBusinessName('');
                setBusinessDescription('');
              }
              
              Alert.alert('Success', 'Business deleted successfully');
            } catch (error) {
              console.error('Error deleting business:', error);
              Alert.alert('Error', 'Failed to delete business');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderBusinessItem = ({ item }) => {
    const firstLetter = item.name ? item.name.charAt(0).toUpperCase() : '?';
    const randomColor = getRandomColor(item.id);
    const isSelected = selectedBusinessId === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.businessItem, 
          isSelected && styles.selectedBusinessItem,
          { backgroundColor: theme.card }
        ]}
        onPress={() => handleSelectBusiness(item)}
      >
        <View style={styles.businessItemContent}>
          <View style={[styles.businessIcon, { backgroundColor: randomColor }]}>
            <Text style={styles.businessIconText}>{firstLetter}</Text>
          </View>
          <View style={styles.businessItemInfo}>
            <Text style={[styles.businessItemName, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.businessStatusContainer}>
              <View 
                style={[
                  styles.statusIndicator, 
                  { 
                    backgroundColor: 
                      item.approvalStatus === 'approved' ? theme.success :
                      item.approvalStatus === 'rejected' ? theme.error :
                      theme.warning 
                  }
                ]} 
              />
              <Text style={[styles.businessStatusText, { color: theme.secondaryText }]}>
                {item.approvalStatus === 'approved' ? 'Approved' :
                 item.approvalStatus === 'rejected' ? 'Rejected' :
                 'Pending Approval'}
              </Text>
            </View>
          </View>
        </View>
        {isSelected && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteBusiness(item.id)}
          >
            <Icon name="delete-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Generate a consistent color based on business ID
  const getRandomColor = (id) => {
    const colors = ['#6C63FF', '#FF6584', '#43A047', '#FB8C00', '#5C6BC0', '#26A69A'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const renderContent = () => {
    if (!selectedBusiness) {
      if (showCreateForm) {
        // Show business registration form
        return (
          <View style={styles.registerContainer}>
            <View style={[styles.formCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.formTitle, { color: theme.text }]}>Register New Business</Text>
              
              <Text style={[styles.label, { color: theme.text }]}>Business Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter business name"
                placeholderTextColor={theme.placeholderText}
                value={businessName}
                onChangeText={setBusinessName}
              />
              
              <Text style={[styles.label, { color: theme.text }]}>Business Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter business description"
                placeholderTextColor={theme.placeholderText}
                value={businessDescription}
                onChangeText={setBusinessDescription}
                multiline
                numberOfLines={4}
              />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: theme.background }]}
                  onPress={() => setShowCreateForm(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.registerButton, { backgroundColor: theme.primary }]}
                  onPress={handleRegisterBusiness}
                  disabled={creatingBusiness}
                >
                  {creatingBusiness ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="store-plus" size={20} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.registerButtonText}>Register Business</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.orDivider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <Text style={[styles.orText, { color: theme.secondaryText }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>
              
              <TouchableOpacity 
                style={[styles.sampleButton, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}
                onPress={handleCreateSampleBusiness}
                disabled={creatingBusiness}
              >
                <Icon name="magic" size={20} color={theme.primary} style={styles.buttonIcon} />
                <Text style={[styles.sampleButtonText, { color: theme.primary }]}>Create Sample Business</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      
      // Show empty state
      return (
        <View style={styles.emptyStateContainer}>
          <Icon name="store-off" size={80} color={theme.secondaryText} />
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Business Selected</Text>
          <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
            Select a business from the list above or create a new one to get started.
          </Text>
          <TouchableOpacity 
            style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowCreateForm(true)}
          >
            <Icon name="store-plus" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.emptyStateButtonText}>Create New Business</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Check if business is pending approval
    if (selectedBusiness.approvalStatus === 'pending') {
      return (
        <View style={styles.approvalRequiredContainer}>
          <Icon name="clock-outline" size={80} color={theme.warning} />
          <Text style={[styles.approvalRequiredTitle, { color: theme.text }]}>Approval Pending</Text>
          <Text style={[styles.approvalRequiredText, { color: theme.secondaryText }]}>
            Your business is pending approval by an administrator.
            You can still edit your business details, but you cannot manage queues until your business is approved.
          </Text>
        </View>
      );
    }
    
    // Show selected tab content
    switch (activeTab) {
      case 'queue':
        return <QueueManagement business={selectedBusiness} />;
      case 'details':
        return (
          <BusinessDetailsForm 
            business={selectedBusiness} 
            onUpdate={handleBusinessUpdate} 
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
        <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>Loading business data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Manage Businesses</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.businessListContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.businessListContent}
        >
          {businesses.map(business => (
            <React.Fragment key={business.id}>
              {renderBusinessItem({ item: business })}
            </React.Fragment>
          ))}
          
          <TouchableOpacity 
            style={[styles.addBusinessButton, { backgroundColor: theme.card }]}
            onPress={() => {
              setShowCreateForm(true);
              setSelectedBusiness(null);
              setSelectedBusinessId(null);
              setBusinessName('');
              setBusinessDescription('');
            }}
          >
            <Icon name="plus" size={24} color={theme.primary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {selectedBusiness ? (
        <>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'queue' && [styles.activeTab, { backgroundColor: theme.primaryLight }]
              ]}
              onPress={() => setActiveTab('queue')}
              disabled={selectedBusiness.approvalStatus !== 'approved'}
            >
              <Icon 
                name="ticket-outline" 
                size={20} 
                color={activeTab === 'queue' ? theme.primary : theme.secondaryText} 
                style={styles.tabIcon}
              />
              <Text 
                style={[
                  styles.tabText, 
                  { color: activeTab === 'queue' ? theme.primary : theme.secondaryText }
                ]}
              >
                Queue Management
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tab, 
                activeTab === 'details' && [styles.activeTab, { backgroundColor: theme.primaryLight }]
              ]}
              onPress={() => setActiveTab('details')}
            >
              <Icon 
                name="information-outline" 
                size={20} 
                color={activeTab === 'details' ? theme.primary : theme.secondaryText} 
                style={styles.tabIcon}
              />
              <Text 
                style={[
                  styles.tabText, 
                  { color: activeTab === 'details' ? theme.primary : theme.secondaryText }
                ]}
              >
                Business Details
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            {renderContent()}
          </View>
        </>
      ) : (
        <View style={styles.content}>
          {renderContent()}
        </View>
      )}
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
  loadingText: {
    fontSize: 16,
    color: '#56409e',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#281b52',
  },
  placeholder: {
    width: 40,
  },
  businessListContainer: {
    paddingHorizontal: 24,
  },
  businessListContent: {
    paddingRight: 16,
  },
  businessItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    minWidth: 180,
  },
  selectedBusinessItem: {
    backgroundColor: '#f0eeff',
    borderColor: '#56409e',
    borderWidth: 1,
  },
  businessItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessIcon: {
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
  businessItemInfo: {
    flex: 1,
  },
  businessItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#281b52',
  },
  businessStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  businessStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#281b52',
  },
  deleteButton: {
    padding: 8,
  },
  addBusinessButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0eeff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
    borderWidth: 1,
    borderColor: '#d8dffe',
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
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
    backgroundColor: '#fff',
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
    color: '#9992a7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  registerContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#281b52',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#281b52',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#281b52',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  registerButton: {
    backgroundColor: '#56409e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orText: {
    paddingHorizontal: 16,
    color: '#9992a7',
    fontWeight: '500',
  },
  sampleButton: {
    backgroundColor: '#f0eeff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8dffe',
  },
  sampleButtonText: {
    color: '#56409e',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#281b52',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9992a7',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#56409e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  approvalRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  approvalRequiredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#281b52',
    marginBottom: 8,
  },
  approvalRequiredText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9992a7',
    marginBottom: 16,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});