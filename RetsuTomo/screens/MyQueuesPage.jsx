import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    FlatList,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    RefreshControl,
    Image,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { firestore, auth } from '../services/firebase';
import { firebase } from '@react-native-firebase/app';
import sampleDataService from '../services/sampleData';

const Tab = createBottomTabNavigator();

function OngoingQueues() {
    const [ongoingQueues, setOngoingQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [businessData, setBusinessData] = useState({});
    const navigation = useNavigation();

    const fetchQueues = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to view your queues.');
                return;
            }

            // Check if we need to populate sample data
            const businessSnapshot = await firestore.collection('businesses').limit(1).get();
            if (businessSnapshot.empty) {
                await sampleDataService.populateSampleData();
                // Join a sample queue for testing
                await sampleDataService.joinSampleQueue(user.uid);
            }

            // Get user's active queues
            const userQueuesSnapshot = await firestore
                .collection('users')
                .doc(user.uid)
                .collection('activeQueues')
                .get();

            const userQueues = userQueuesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Fetch business details for each queue
            const businessIds = [...new Set(userQueues.map(q => q.businessId))];
            const businessDetails = {};
            
            await Promise.all(
                businessIds.map(async (businessId) => {
                    const businessDoc = await firestore.collection('businesses').doc(businessId).get();
                    if (businessDoc.exists) {
                        businessDetails[businessId] = businessDoc.data();
                    }
                })
            );
            
            setBusinessData(businessDetails);
            
            // Get queue positions and wait times
            const queuesWithDetails = await Promise.all(
                userQueues.map(async (queue) => {
                    const queueSnapshot = await firestore
                        .collection('businesses')
                        .doc(queue.businessId)
                        .collection('queues')
                        .where('status', '==', 'active')
                        .where('queueNumber', '<', queue.queueNumber)
                        .get();
                    
                    const position = queueSnapshot.size + 1;
                    let estimatedWaitTime = null;
                    
                    if (businessDetails[queue.businessId]?.estimatedTimePerCustomer) {
                        estimatedWaitTime = (position - 1) * businessDetails[queue.businessId].estimatedTimePerCustomer;
                    }
                    
                    return {
                        ...queue,
                        position,
                        estimatedWaitTime,
                    };
                })
            );
            
            setOngoingQueues(queuesWithDetails);
        } catch (error) {
            console.error('Error fetching queues:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchQueues();
        
        // Set up real-time listener for queue updates
        const user = auth.currentUser;
        if (!user) return;
        
        const unsubscribe = firestore
            .collection('users')
            .doc(user.uid)
            .collection('activeQueues')
            .onSnapshot(() => {
                fetchQueues();
            }, error => {
                console.error('Queue listener error:', error);
            });
            
        return () => unsubscribe();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchQueues();
    };

    const handleViewBusiness = (businessId) => {
        navigation.navigate('QueuePage', { 
            businessId, 
            businessName: businessData[businessId]?.name || 'Business' 
        });
    };

    const handleCancelQueue = async (queueId, businessId, queueNumber) => {
        try {
            Alert.alert(
                'Cancel Queue',
                'Are you sure you want to leave this queue?',
                [
                    {
                        text: 'No',
                        style: 'cancel',
                    },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            setLoading(true);
                            const user = auth.currentUser;
                            
                            // Find the queue document in the business collection
                            const businessQueuesSnapshot = await firestore
                                .collection('businesses')
                                .doc(businessId)
                                .collection('queues')
                                .where('userId', '==', user.uid)
                                .where('queueNumber', '==', queueNumber)
                                .where('status', '==', 'active')
                                .get();
                                
                            if (!businessQueuesSnapshot.empty) {
                                // Update queue status to cancelled
                                await firestore
                                    .collection('businesses')
                                    .doc(businessId)
                                    .collection('queues')
                                    .doc(businessQueuesSnapshot.docs[0].id)
                                    .update({
                                        status: 'cancelled',
                                        cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    });
                            }
                                
                            // Remove from user's active queues
                            await firestore
                                .collection('users')
                                .doc(user.uid)
                                .collection('activeQueues')
                                .doc(queueId)
                                .delete();
                                
                            // Refresh the queue list
                            fetchQueues();
                            
                            Alert.alert('Queue Cancelled', 'You have successfully left the queue.');
                        },
                    },
                ],
                { cancelable: true }
            );
        } catch (error) {
            console.error('Error cancelling queue:', error);
            Alert.alert('Error', error.message);
        }
    };

    const renderQueueItem = ({ item }) => {
        const business = businessData[item.businessId] || {};
        
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleViewBusiness(item.businessId)}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.businessIcon, { backgroundColor: getRandomColor(item.businessId) }]}>
                        <Text style={styles.businessIconText}>
                            {business.name ? business.name.charAt(0).toUpperCase() : 'B'}
                        </Text>
                    </View>
                    <View style={styles.cardHeaderContent}>
                        <Text style={styles.businessName}>{business.name || 'Business'}</Text>
                        <View style={styles.queueNumberContainer}>
                            <Text style={styles.queueNumberLabel}>Queue #</Text>
                            <Text style={styles.queueNumber}>{item.queueNumber}</Text>
                        </View>
                    </View>
                </View>
                
                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <Icon name="account-multiple" size={20} color="#56409e" />
                        <Text style={styles.infoText}>
                            Position: <Text style={styles.infoHighlight}>{item.position} in line</Text>
                        </Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="clock-outline" size={20} color="#56409e" />
                        <Text style={styles.infoText}>
                            Wait time: <Text style={styles.infoHighlight}>
                                {item.estimatedWaitTime !== null 
                                    ? item.estimatedWaitTime === 0 
                                        ? 'You are next!' 
                                        : `~${item.estimatedWaitTime} mins` 
                                    : 'Unknown'}
                            </Text>
                        </Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Icon name="calendar-clock" size={20} color="#56409e" />
                        <Text style={styles.infoText}>
                            Joined: <Text style={styles.infoHighlight}>
                                {item.joinedAt ? formatTimestamp(item.joinedAt) : 'Recently'}
                            </Text>
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelQueue(item.id, item.businessId, item.queueNumber)}
                >
                    <Text style={styles.cancelButtonText}>Leave Queue</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#56409e" />
                    <Text style={styles.loadingText}>Loading your queues...</Text>
                </View>
            ) : (
                <>
                    <Icon name="ticket-confirmation-outline" size={60} color="#d8dffe" />
                    <Text style={styles.emptyTitle}>No active queues</Text>
                    <Text style={styles.emptyText}>
                        You're not currently in any queues. Browse businesses to join a queue.
                    </Text>
                    <TouchableOpacity
                        style={styles.browseButton}
                        onPress={() => navigation.navigate('BusinessList')}
                    >
                        <Text style={styles.browseButtonText}>Browse Businesses</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.title}>My Queues</Text>
                <Text style={styles.subtitle}>Track your active queues</Text>
            </View>
            
            <FlatList
                data={ongoingQueues}
                keyExtractor={item => item.id}
                renderItem={renderQueueItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={renderEmptyComponent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#56409e']}
                    />
                }
            />
        </SafeAreaView>
    );
}

function FinishedQueues() {
    const [finishedQueues, setFinishedQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [businessData, setBusinessData] = useState({});
    const navigation = useNavigation();

    const fetchQueues = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to view your queues.');
                return;
            }

            const snapshot = await firestore
                .collectionGroup('queues')
                .where('userId', '==', user.uid)
                .where('status', 'in', ['finished', 'cancelled'])
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            const finished = snapshot.docs.map(doc => ({
                id: doc.id,
                businessId: doc.ref.path.split('/')[1], // Extract businessId from path
                ...doc.data(),
            }));

            // Fetch business details for each queue
            const businessIds = [...new Set(finished.map(q => q.businessId))];
            const businessDetails = {};
            
            await Promise.all(
                businessIds.map(async (businessId) => {
                    const businessDoc = await firestore.collection('businesses').doc(businessId).get();
                    if (businessDoc.exists) {
                        businessDetails[businessId] = businessDoc.data();
                    }
                })
            );
            
            setBusinessData(businessDetails);
            setFinishedQueues(finished);
        } catch (error) {
            console.error('Error fetching finished queues:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchQueues();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchQueues();
    };

    const renderQueueItem = ({ item }) => {
        const business = businessData[item.businessId] || {};
        const isFinished = item.status === 'finished';
        
        return (
            <View style={styles.historyCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.businessIcon, { backgroundColor: getRandomColor(item.businessId) }]}>
                        <Text style={styles.businessIconText}>
                            {business.name ? business.name.charAt(0).toUpperCase() : 'B'}
                        </Text>
                    </View>
                    <View style={styles.cardHeaderContent}>
                        <Text style={styles.businessName}>{business.name || 'Business'}</Text>
                        <View style={styles.queueNumberContainer}>
                            <Text style={styles.queueNumberLabel}>Queue #</Text>
                            <Text style={styles.queueNumber}>{item.queueNumber}</Text>
                        </View>
                    </View>
                    <View style={[
                        styles.statusBadge, 
                        isFinished ? styles.finishedBadge : styles.cancelledBadge
                    ]}>
                        <Text style={styles.statusText}>
                            {isFinished ? 'Completed' : 'Cancelled'}
                        </Text>
                    </View>
                </View>
                
                <View style={styles.historyCardContent}>
                    <View style={styles.infoRow}>
                        <Icon name="calendar-clock" size={20} color="#9992a7" />
                        <Text style={styles.historyInfoText}>
                            {isFinished ? 'Completed' : 'Cancelled'} on {formatTimestamp(item.finishedAt || item.cancelledAt)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#56409e" />
                    <Text style={styles.loadingText}>Loading your queue history...</Text>
                </View>
            ) : (
                <>
                    <Icon name="history" size={60} color="#d8dffe" />
                    <Text style={styles.emptyTitle}>No queue history</Text>
                    <Text style={styles.emptyText}>
                        Your completed and cancelled queues will appear here.
                    </Text>
                </>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.title}>Queue History</Text>
                <Text style={styles.subtitle}>Your past queues</Text>
            </View>
            
            <FlatList
                data={finishedQueues}
                keyExtractor={item => item.id}
                renderItem={renderQueueItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={renderEmptyComponent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#56409e']}
                    />
                }
            />
        </SafeAreaView>
    );
}

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Unknown';
    }
};

// Generate a consistent color based on business ID
const getRandomColor = (id) => {
    if (!id) return '#6C63FF';
    const colors = ['#6C63FF', '#FF6584', '#43A047', '#FB8C00', '#5C6BC0', '#26A69A'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

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
        backgroundColor: '#f5f5f5',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
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
    list: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        elevation: 2,
    },
    historyCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        elevation: 2,
        opacity: 0.9,
    },
    cardHeader: {
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
    cardHeaderContent: {
        flex: 1,
    },
    businessName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#281b52',
    },
    queueNumberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    queueNumberLabel: {
        fontSize: 12,
        color: '#9992a7',
        marginRight: 4,
    },
    queueNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#56409e',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    finishedBadge: {
        backgroundColor: '#e8f5e9',
    },
    cancelledBadge: {
        backgroundColor: '#ffebee',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    cardContent: {
        marginTop: 16,
        marginBottom: 16,
    },
    historyCardContent: {
        marginTop: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#281b52',
        marginLeft: 8,
    },
    historyInfoText: {
        fontSize: 14,
        color: '#9992a7',
        marginLeft: 8,
    },
    infoHighlight: {
        fontWeight: '600',
        color: '#56409e',
    },
    cancelButton: {
        backgroundColor: '#ffebee',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#f44336',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#56409e',
        marginTop: 16,
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
        marginHorizontal: 32,
    },
    browseButton: {
        backgroundColor: '#56409e',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 24,
    },
    browseButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
    },
});