import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    StatusBar,
    FlatList,
    Modal,
} from 'react-native';
import { auth, firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QueueManagement from '../components/QueueManagement';
import BusinessDetailsForm from '../components/BusinessDetailsForm';
import sampleDataService from '../services/sampleData';

export default function ManageBusinessesPage({ navigation }) {
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

            // Add the business to the `businesses` collection
            const businessData = {
                name: businessName.trim(),
                description: businessDescription.trim(),
                ownerId: user.uid,
                category: 'Other',
                status: 'open',
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
            
            setBusinesses(prevBusinesses => [...prevBusinesses, newBusiness]);
            setSelectedBusiness(newBusiness);
            setSelectedBusinessId(businessRef.id);
            setShowCreateForm(false);
            
            Alert.alert('Success', 'Business registered successfully!');
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

    const renderBusinessItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.businessItem,
                selectedBusinessId === item.id && styles.selectedBusinessItem
            ]}
            onPress={() => handleSelectBusiness(item)}
        >
            <View style={styles.businessItemContent}>
                <View style={[
                    styles.businessIcon, 
                    { backgroundColor: getRandomColor(item.id) }
                ]}>
                    <Text style={styles.businessIconText}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.businessItemInfo}>
                    <Text style={styles.businessItemName}>{item.name}</Text>
                    <View style={styles.businessStatusContainer}>
                        <View style={[
                            styles.statusIndicator, 
                            { backgroundColor: item.status === 'open' ? '#43A047' : '#F44336' }
                        ]} />
                        <Text style={styles.businessStatusText}>
                            {item.status === 'open' ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>
            </View>
            
            {selectedBusinessId === item.id && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBusiness(item.id)}
                >
                    <Icon name="delete-outline" size={20} color="#F44336" />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

    // Generate a consistent color based on business ID
    const getRandomColor = (id) => {
        const colors = ['#6C63FF', '#FF6584', '#43A047', '#FB8C00', '#5C6BC0', '#26A69A'];
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#56409e" />
                <Text style={styles.loadingText}>Loading business data...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            
            <View style={styles.header}>
                <Text style={styles.title}>Manage Businesses</Text>
                <Text style={styles.subtitle}>
                    {businesses.length > 0 
                        ? `You have ${businesses.length} ${businesses.length === 1 ? 'business' : 'businesses'}`
                        : 'Create your first business to start managing queues'}
                </Text>
            </View>

            {businesses.length > 0 ? (
                <>
                    <View style={styles.businessList}>
                        <FlatList
                            data={businesses}
                            renderItem={renderBusinessItem}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.businessListContent}
                        />
                        <TouchableOpacity
                            style={styles.addBusinessButton}
                            onPress={() => setShowCreateForm(true)}
                        >
                            <Icon name="plus" size={24} color="#56409e" />
                        </TouchableOpacity>
                    </View>
                    
                    {selectedBusiness && (
                        <>
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'queue' && styles.activeTab]}
                                    onPress={() => setActiveTab('queue')}
                                >
                                    <Icon 
                                        name="account-multiple" 
                                        size={20} 
                                        color={activeTab === 'queue' ? '#56409e' : '#9992a7'} 
                                        style={styles.tabIcon} 
                                    />
                                    <Text 
                                        style={[
                                            styles.tabText, 
                                            activeTab === 'queue' && styles.activeTabText
                                        ]}
                                    >
                                        Queue
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                                    onPress={() => setActiveTab('details')}
                                >
                                    <Icon 
                                        name="store-settings" 
                                        size={20} 
                                        color={activeTab === 'details' ? '#56409e' : '#9992a7'} 
                                        style={styles.tabIcon} 
                                    />
                                    <Text 
                                        style={[
                                            styles.tabText, 
                                            activeTab === 'details' && styles.activeTabText
                                        ]}
                                    >
                                        Details
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.content}>
                                {activeTab === 'queue' ? (
                                    <QueueManagement businessId={selectedBusinessId} />
                                ) : (
                                    <BusinessDetailsForm 
                                        business={selectedBusiness} 
                                        businessId={selectedBusinessId} 
                                        onUpdate={handleBusinessUpdate} 
                                    />
                                )}
                            </View>
                        </>
                    )}
                </>
            ) : (
                <ScrollView style={styles.content}>
                    <View style={styles.registerContainer}>
                        <View style={styles.formCard}>
                            <Text style={styles.formTitle}>Create a Business</Text>
                            
                            <Text style={styles.label}>Business Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter business name"
                                placeholderTextColor="#9992a7"
                                value={businessName}
                                onChangeText={setBusinessName}
                            />
                            
                            <Text style={styles.label}>Business Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your business"
                                placeholderTextColor="#9992a7"
                                value={businessDescription}
                                onChangeText={setBusinessDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            
                            <TouchableOpacity
                                style={styles.registerButton}
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
                            <View style={styles.dividerLine} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>
                        
                        <TouchableOpacity
                            style={styles.sampleButton}
                            onPress={handleCreateSampleBusiness}
                            disabled={creatingBusiness}
                        >
                            {creatingBusiness ? (
                                <ActivityIndicator size="small" color="#56409e" />
                            ) : (
                                <>
                                    <Icon name="rocket-launch" size={20} color="#56409e" style={styles.buttonIcon} />
                                    <Text style={styles.sampleButtonText}>Create Sample Business</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            {/* Create Business Modal */}
            <Modal
                visible={showCreateForm}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateForm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create New Business</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowCreateForm(false)}
                            >
                                <Icon name="close" size={24} color="#281b52" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.label}>Business Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter business name"
                                placeholderTextColor="#9992a7"
                                value={businessName}
                                onChangeText={setBusinessName}
                            />
                            
                            <Text style={styles.label}>Business Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your business"
                                placeholderTextColor="#9992a7"
                                value={businessDescription}
                                onChangeText={setBusinessDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                            
                            <TouchableOpacity
                                style={styles.registerButton}
                                onPress={handleRegisterBusiness}
                                disabled={creatingBusiness}
                            >
                                {creatingBusiness ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Icon name="store-plus" size={20} color="#fff" style={styles.buttonIcon} />
                                        <Text style={styles.registerButtonText}>Create Business</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            
                            <View style={styles.orDivider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.dividerLine} />
                            </View>
                            
                            <TouchableOpacity
                                style={styles.sampleButton}
                                onPress={handleCreateSampleBusiness}
                                disabled={creatingBusiness}
                            >
                                {creatingBusiness ? (
                                    <ActivityIndicator size="small" color="#56409e" />
                                ) : (
                                    <>
                                        <Icon name="rocket-launch" size={20} color="#56409e" style={styles.buttonIcon} />
                                        <Text style={styles.sampleButtonText}>Create Sample Business</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        fontSize: 16,
        color: '#56409e',
        marginTop: 16,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#281b52',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#9992a7',
        marginTop: 4,
    },
    businessList: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 24,
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
    activeTabText: {
        color: '#56409e',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#281b52',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
});