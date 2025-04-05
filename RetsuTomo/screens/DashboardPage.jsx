import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Image,
    ScrollView,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth, firestore } from '../services/firebase';
import sampleDataService from '../services/sampleData';

export default function DashboardPage() {
    const navigation = useNavigation();
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('customer'); // 'customer' or 'business'
    const [userBusinesses, setUserBusinesses] = useState([]);
    const [activeQueues, setActiveQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                
                if (user) {
                    // Fetch user profile
                    const profileDoc = await firestore.collection('profiles').doc(user.uid).get();
                    if (profileDoc.exists) {
                        setUserName(profileDoc.data().name || 'User');
                    }
                    
                    // Fetch user businesses
                    const businessSnapshot = await firestore
                        .collection('businesses')
                        .where('ownerId', '==', user.uid)
                        .get();
                    
                    const businesses = businessSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    
                    setUserBusinesses(businesses);
                    setUserRole(businesses.length > 0 ? 'business' : 'customer');
                    
                    // Fetch active queues for the user
                    const queueSnapshot = await firestore
                        .collection('queues')
                        .where('userId', '==', user.uid)
                        .where('status', 'in', ['waiting', 'current'])
                        .get();
                    
                    const queues = queueSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    
                    // Fetch business details for each queue
                    const queuesWithBusinessDetails = await Promise.all(
                        queues.map(async (queue) => {
                            const businessDoc = await firestore
                                .collection('businesses')
                                .doc(queue.businessId)
                                .get();
                            
                            return {
                                ...queue,
                                businessName: businessDoc.exists ? businessDoc.data().name : 'Unknown Business',
                                businessCategory: businessDoc.exists ? businessDoc.data().category : '',
                            };
                        })
                    );
                    
                    setActiveQueues(queuesWithBusinessDetails);
                    
                    // Populate sample data if needed
                    if (businessSnapshot.empty && queueSnapshot.empty) {
                        await sampleDataService.populateSampleData();
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                Alert.alert('Error', 'Failed to load user data');
            } finally {
                setLoading(false);
            }
        };
        
        fetchUserData();
    }, []);
    
    const handleCreateBusiness = async () => {
        try {
            const businessId = await sampleDataService.createSampleBusinessForUser();
            if (businessId) {
                Alert.alert(
                    'Business Created',
                    'Your sample business has been created. You can now manage it!',
                    [
                        { 
                            text: 'Manage Now', 
                            onPress: () => navigation.navigate('ManageBusinessesPage') 
                        }
                    ]
                );
                // Refresh user businesses
                const user = auth.currentUser;
                const businessSnapshot = await firestore
                    .collection('businesses')
                    .where('ownerId', '==', user.uid)
                    .get();
                
                const businesses = businessSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                
                setUserBusinesses(businesses);
                setUserRole('business');
            }
        } catch (error) {
            console.error('Error creating business:', error);
            Alert.alert('Error', 'Failed to create business');
        }
    };
    
    const renderBusinessItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.businessCard} 
            onPress={() => navigation.navigate('ManageQueuesPage', { businessId: item.id })}
        >
            <View style={styles.businessIconContainer}>
                <Icon name="store" size={24} color="#fff" />
            </View>
            <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{item.name}</Text>
                <Text style={styles.businessStatus}>
                    Status: <Text style={{ color: item.status === 'open' ? '#43A047' : '#F44336' }}>
                        {item.status === 'open' ? 'Open' : 'Closed'}
                    </Text>
                </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9992a7" />
        </TouchableOpacity>
    );
    
    const renderQueueItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.queueCard} 
            onPress={() => navigation.navigate('MyQueuesPage')}
        >
            <View style={styles.queueInfo}>
                <Text style={styles.queueBusinessName}>{item.businessName}</Text>
                <Text style={styles.queueStatus}>
                    Status: <Text style={{ 
                        color: item.status === 'current' ? '#43A047' : '#FB8C00' 
                    }}>
                        {item.status === 'current' ? 'Your Turn' : 'Waiting'}
                    </Text>
                </Text>
                <Text style={styles.queueWaitTime}>
                    {item.status === 'current' 
                        ? 'It\'s your turn now!' 
                        : `Est. wait: ${item.estimatedWaitTime} mins`}
                </Text>
            </View>
            <View style={[
                styles.queuePosition, 
                { backgroundColor: item.status === 'current' ? '#43A047' : '#FB8C00' }
            ]}>
                <Text style={styles.queuePositionText}>
                    {item.status === 'current' ? 'Now' : `#${item.position}`}
                </Text>
            </View>
        </TouchableOpacity>
    );
    
    const renderRoleSection = () => {
        if (userRole === 'business') {
            return (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Your Businesses</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('ManageBusinessesPage')}>
                            <Text style={styles.sectionAction}>Manage All</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {userBusinesses.length > 0 ? (
                        <FlatList
                            data={userBusinesses}
                            renderItem={renderBusinessItem}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.businessList}
                        />
                    ) : (
                        <TouchableOpacity 
                            style={styles.createBusinessCard}
                            onPress={handleCreateBusiness}
                        >
                            <Icon name="plus-circle" size={24} color="#56409e" />
                            <Text style={styles.createBusinessText}>Create Your First Business</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        } else {
            return (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Business Owner?</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.createBusinessCard}
                        onPress={handleCreateBusiness}
                    >
                        <Icon name="store-plus" size={24} color="#56409e" />
                        <Text style={styles.createBusinessText}>Create a Business</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.infoText}>
                        As a business owner, you can create and manage queues for your customers
                    </Text>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hello, {userName || 'there'}!</Text>
                        <Text style={styles.title}>RetsuTomo</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.profileButton}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Icon name="account" size={24} color="#281b52" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.roleToggleContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.roleToggleButton, 
                            userRole === 'customer' && styles.roleToggleButtonActive
                        ]}
                        onPress={() => setUserRole('customer')}
                    >
                        <Icon 
                            name="account-multiple" 
                            size={20} 
                            color={userRole === 'customer' ? '#fff' : '#56409e'} 
                        />
                        <Text style={[
                            styles.roleToggleText,
                            userRole === 'customer' && styles.roleToggleTextActive
                        ]}>
                            Customer
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[
                            styles.roleToggleButton, 
                            userRole === 'business' && styles.roleToggleButtonActive
                        ]}
                        onPress={() => setUserRole('business')}
                    >
                        <Icon 
                            name="store" 
                            size={20} 
                            color={userRole === 'business' ? '#fff' : '#56409e'} 
                        />
                        <Text style={[
                            styles.roleToggleText,
                            userRole === 'business' && styles.roleToggleTextActive
                        ]}>
                            Business
                        </Text>
                    </TouchableOpacity>
                </View>
                
                {userRole === 'customer' && (
                    <View style={styles.actionCardsContainer}>
                        <TouchableOpacity 
                            style={[styles.actionCard, styles.actionCardPrimary]}
                            onPress={() => navigation.navigate('BusinessListPage')}
                        >
                            <Icon name="magnify" size={24} color="#fff" />
                            <Text style={styles.actionCardTextPrimary}>Find Businesses</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('MyQueuesPage')}
                        >
                            <Icon name="ticket-account" size={24} color="#56409e" />
                            <Text style={styles.actionCardText}>My Queues</Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                {userRole === 'business' && (
                    <View style={styles.actionCardsContainer}>
                        <TouchableOpacity 
                            style={[styles.actionCard, styles.actionCardPrimary]}
                            onPress={() => navigation.navigate('ManageQueuesPage')}
                        >
                            <Icon name="format-list-numbered" size={24} color="#fff" />
                            <Text style={styles.actionCardTextPrimary}>Manage Queues</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('ManageBusinessesPage')}
                        >
                            <Icon name="store-settings" size={24} color="#56409e" />
                            <Text style={styles.actionCardText}>Manage Businesses</Text>
                        </TouchableOpacity>
                    </View>
                )}
                
                {activeQueues.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Your Active Queues</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('MyQueuesPage')}>
                                <Text style={styles.sectionAction}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <FlatList
                            data={activeQueues}
                            renderItem={renderQueueItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.queueList}
                        />
                    </View>
                )}
                
                {renderRoleSection()}
                
                <View style={styles.aiInsightsContainer}>
                    <View style={styles.aiInsightsHeader}>
                        <Icon name="brain" size={24} color="#56409e" />
                        <Text style={styles.aiInsightsTitle}>AI-Powered Insights</Text>
                    </View>
                    <Text style={styles.aiInsightsDescription}>
                        RetsuTomo uses Vertex AI to analyze queue patterns and provide smart recommendations.
                    </Text>
                    <TouchableOpacity style={styles.aiInsightsButton}>
                        <Text style={styles.aiInsightsButtonText}>Learn More</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
    },
    greeting: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9992a7',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#281b52',
        marginTop: 4,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    roleToggleContainer: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginTop: 16,
        backgroundColor: '#f0eeff',
        borderRadius: 12,
        padding: 4,
    },
    roleToggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    roleToggleButtonActive: {
        backgroundColor: '#56409e',
    },
    roleToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#56409e',
        marginLeft: 6,
    },
    roleToggleTextActive: {
        color: '#fff',
    },
    actionCardsContainer: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginTop: 24,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
        elevation: 2,
        height: 100,
    },
    actionCardPrimary: {
        backgroundColor: '#56409e',
    },
    actionCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#281b52',
        marginTop: 8,
        textAlign: 'center',
    },
    actionCardTextPrimary: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginTop: 8,
        textAlign: 'center',
    },
    sectionContainer: {
        marginTop: 24,
        paddingHorizontal: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#281b52',
    },
    sectionAction: {
        fontSize: 14,
        fontWeight: '600',
        color: '#56409e',
    },
    businessList: {
        paddingRight: 16,
    },
    businessCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginRight: 16,
        width: 250,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },
    businessIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#56409e',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    businessInfo: {
        flex: 1,
    },
    businessName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#281b52',
    },
    businessStatus: {
        fontSize: 14,
        color: '#9992a7',
        marginTop: 4,
    },
    createBusinessCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        marginBottom: 16,
    },
    createBusinessText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#56409e',
        marginLeft: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#9992a7',
        textAlign: 'center',
        marginBottom: 16,
    },
    queueList: {
        marginBottom: 16,
    },
    queueCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },
    queueInfo: {
        flex: 1,
    },
    queueBusinessName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#281b52',
    },
    queueStatus: {
        fontSize: 14,
        color: '#9992a7',
        marginTop: 2,
    },
    queueWaitTime: {
        fontSize: 14,
        fontWeight: '500',
        color: '#9992a7',
        marginTop: 2,
    },
    queuePosition: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    queuePositionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    aiInsightsContainer: {
        backgroundColor: '#f0eeff',
        borderRadius: 16,
        padding: 20,
        margin: 24,
        marginTop: 32,
        marginBottom: 40,
    },
    aiInsightsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    aiInsightsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#281b52',
        marginLeft: 10,
    },
    aiInsightsDescription: {
        fontSize: 14,
        color: '#56409e',
        lineHeight: 20,
    },
    aiInsightsButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
        marginTop: 16,
    },
    aiInsightsButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#56409e',
    },
});