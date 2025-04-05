import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
} from 'react-native';
import { firebase } from '@react-native-firebase/app';
import { firestore, auth } from '../services/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function QueuePage({ route, navigation }) {
    const { businessId, businessName: routeBusinessName } = route.params;
    const [business, setBusiness] = useState(null);
    const [queueNumber, setQueueNumber] = useState(null);
    const [queuePosition, setQueuePosition] = useState(null);
    const [estimatedWaitTime, setEstimatedWaitTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [userQueue, setUserQueue] = useState(null);

    useEffect(() => {
        const fetchBusinessDetails = async () => {
            try {
                setLoading(true);
                const businessDoc = await firestore.collection('businesses').doc(businessId).get();
                
                if (businessDoc.exists) {
                    setBusiness(businessDoc.data());
                } else {
                    Alert.alert('Error', 'Business not found.');
                    navigation.goBack();
                    return;
                }
                
                // Check if user is already in queue
                const user = auth.currentUser;
                if (user) {
                    const queueSnapshot = await firestore
                        .collection('businesses')
                        .doc(businessId)
                        .collection('queues')
                        .where('userId', '==', user.uid)
                        .where('status', '==', 'active')
                        .get();
                    
                    if (!queueSnapshot.empty) {
                        const queueData = queueSnapshot.docs[0].data();
                        setUserQueue({
                            id: queueSnapshot.docs[0].id,
                            ...queueData
                        });
                        setQueueNumber(queueData.queueNumber);
                        
                        // Calculate position in queue
                        await calculateQueuePosition(queueData.queueNumber);
                    }
                }
            } catch (error) {
                console.error('Error fetching business details:', error);
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinessDetails();
        
        // Set up real-time listener for queue updates
        const unsubscribe = firestore
            .collection('businesses')
            .doc(businessId)
            .collection('queues')
            .where('status', '==', 'active')
            .onSnapshot(snapshot => {
                if (queueNumber) {
                    calculateQueuePosition(queueNumber);
                }
            }, error => {
                console.error('Queue listener error:', error);
            });
            
        return () => unsubscribe();
    }, [businessId, queueNumber]);

    const calculateQueuePosition = async (currentQueueNumber) => {
        try {
            const queueSnapshot = await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .where('status', '==', 'active')
                .where('queueNumber', '<', currentQueueNumber)
                .get();
                
            const position = queueSnapshot.size + 1;
            setQueuePosition(position);
            
            // Calculate estimated wait time
            if (business && business.estimatedTimePerCustomer) {
                const waitTime = (position - 1) * business.estimatedTimePerCustomer;
                setEstimatedWaitTime(waitTime);
            }
        } catch (error) {
            console.error('Error calculating queue position:', error);
        }
    };

    const handleTakeQueue = async () => {
        try {
            setJoining(true);
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to take a queue.');
                return;
            }

            // Check if business is open
            if (business.status !== 'open') {
                Alert.alert('Business Closed', 'This business is currently not accepting new queue entries.');
                return;
            }

            // Check if user is already in a queue at this business
            const existingQueueSnapshot = await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .where('userId', '==', user.uid)
                .where('status', '==', 'active')
                .get();
                
            if (!existingQueueSnapshot.empty) {
                Alert.alert('Already in Queue', 'You are already in the queue for this business.');
                setUserQueue({
                    id: existingQueueSnapshot.docs[0].id,
                    ...existingQueueSnapshot.docs[0].data()
                });
                setQueueNumber(existingQueueSnapshot.docs[0].data().queueNumber);
                return;
            }

            const queueRef = firestore.collection('businesses').doc(businessId).collection('queues');

            // Get the current active queues and determine the next queue number
            const snapshot = await queueRef.where('status', '==', 'active').get();
            const newQueueNumber = snapshot.size + 1; // Next queue number

            // Add to user's active queues
            await firestore.collection('users').doc(user.uid).collection('activeQueues').add({
                businessId: businessId,
                businessName: business.name,
                queueNumber: newQueueNumber,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Add to business queues
            const newQueue = await queueRef.add({
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userEmail: user.email,
                queueNumber: newQueueNumber,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            setQueueNumber(newQueueNumber);
            setUserQueue({
                id: newQueue.id,
                queueNumber: newQueueNumber,
                status: 'active',
            });
            
            await calculateQueuePosition(newQueueNumber);
            
            Alert.alert('Success', `You have joined the queue. Your number is ${newQueueNumber}`);
        } catch (error) {
            console.error('Error taking queue:', error);
            Alert.alert('Error', error.message);
        } finally {
            setJoining(false);
        }
    };

    const handleCancelQueue = async () => {
        try {
            if (!userQueue) return;
            
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
                            
                            // Update queue status to cancelled
                            await firestore
                                .collection('businesses')
                                .doc(businessId)
                                .collection('queues')
                                .doc(userQueue.id)
                                .update({
                                    status: 'cancelled',
                                    cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                                });
                                
                            // Remove from user's active queues
                            const userQueuesSnapshot = await firestore
                                .collection('users')
                                .doc(user.uid)
                                .collection('activeQueues')
                                .where('businessId', '==', businessId)
                                .get();
                                
                            const batch = firestore.batch();
                            userQueuesSnapshot.docs.forEach(doc => {
                                batch.delete(doc.ref);
                            });
                            await batch.commit();
                            
                            setUserQueue(null);
                            setQueueNumber(null);
                            setQueuePosition(null);
                            setEstimatedWaitTime(null);
                            setLoading(false);
                            
                            Alert.alert('Queue Cancelled', 'You have successfully left the queue.');
                        },
                    },
                ],
                { cancelable: true }
            );
        } catch (error) {
            console.error('Error cancelling queue:', error);
            Alert.alert('Error', error.message);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#56409e" />
                <Text style={styles.loadingText}>Loading queue information...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#281b52" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{business?.name || routeBusinessName}</Text>
                </View>
                
                <View style={styles.businessCard}>
                    <View style={styles.businessHeader}>
                        <View style={[styles.businessIcon, { backgroundColor: getRandomColor(businessId) }]}>
                            <Text style={styles.businessIconText}>
                                {business?.name?.charAt(0).toUpperCase() || 'B'}
                            </Text>
                        </View>
                        <View style={styles.businessInfo}>
                            <Text style={styles.businessName}>{business?.name}</Text>
                            <View style={styles.businessStatusContainer}>
                                <View style={[
                                    styles.statusIndicator, 
                                    { backgroundColor: business?.status === 'open' ? '#43A047' : '#F44336' }
                                ]} />
                                <Text style={styles.businessStatusText}>
                                    {business?.status === 'open' ? 'Open' : 'Closed'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    
                    {business?.description && (
                        <Text style={styles.businessDescription}>{business.description}</Text>
                    )}
                    
                    {business?.category && (
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryChipText}>{business.category}</Text>
                        </View>
                    )}
                </View>
                
                {queueNumber ? (
                    <View style={styles.queueInfoCard}>
                        <View style={styles.queueNumberContainer}>
                            <Text style={styles.queueLabel}>Your Queue Number</Text>
                            <Text style={styles.queueNumber}>{queueNumber}</Text>
                        </View>
                        
                        <View style={styles.queueDetailsContainer}>
                            <View style={styles.queueDetailItem}>
                                <Icon name="account-multiple" size={24} color="#56409e" />
                                <View style={styles.queueDetailText}>
                                    <Text style={styles.queueDetailLabel}>Position</Text>
                                    <Text style={styles.queueDetailValue}>
                                        {queuePosition ? `${queuePosition} in line` : 'Calculating...'}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={styles.queueDetailItem}>
                                <Icon name="clock-outline" size={24} color="#56409e" />
                                <View style={styles.queueDetailText}>
                                    <Text style={styles.queueDetailLabel}>Estimated Wait</Text>
                                    <Text style={styles.queueDetailValue}>
                                        {estimatedWaitTime !== null 
                                            ? estimatedWaitTime === 0 
                                                ? 'You are next!' 
                                                : `~${estimatedWaitTime} minutes` 
                                            : 'Calculating...'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancelQueue}
                        >
                            <Text style={styles.cancelButtonText}>Leave Queue</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.joinQueueContainer}>
                        <Text style={styles.joinQueueTitle}>Ready to Join?</Text>
                        <Text style={styles.joinQueueSubtitle}>
                            Get in line virtually and we'll notify you when it's your turn
                        </Text>
                        
                        <TouchableOpacity
                            style={[
                                styles.joinButton,
                                (joining || business?.status !== 'open') && styles.disabledButton
                            ]}
                            onPress={handleTakeQueue}
                            disabled={joining || business?.status !== 'open'}
                        >
                            {joining ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Icon name="ticket-outline" size={20} color="#fff" style={styles.buttonIcon} />
                                    <Text style={styles.joinButtonText}>
                                        {business?.status === 'open' ? 'Join Queue' : 'Business Closed'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                
                <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>Queue Information</Text>
                    
                    <View style={styles.infoCard}>
                        <View style={styles.infoItem}>
                            <Icon name="clock-time-four-outline" size={24} color="#56409e" />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoItemTitle}>Service Time</Text>
                                <Text style={styles.infoItemText}>
                                    {business?.estimatedTimePerCustomer 
                                        ? `~${business.estimatedTimePerCustomer} minutes per customer` 
                                        : 'Not specified'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.infoItem}>
                            <Icon name="information-outline" size={24} color="#56409e" />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoItemTitle}>How It Works</Text>
                                <Text style={styles.infoItemText}>
                                    Join the queue and monitor your position. You'll be notified when it's your turn.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Generate a consistent color based on business ID
const getRandomColor = (id) => {
    const colors = ['#6C63FF', '#FF6584', '#43A047', '#FB8C00', '#5C6BC0', '#26A69A'];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#281b52',
        flex: 1,
    },
    businessCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 24,
        marginTop: 16,
        elevation: 2,
    },
    businessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    businessIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    businessIconText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    businessInfo: {
        flex: 1,
    },
    businessName: {
        fontSize: 18,
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
    businessDescription: {
        fontSize: 14,
        color: '#9992a7',
        marginTop: 12,
        marginBottom: 12,
    },
    categoryChip: {
        backgroundColor: '#f0eeff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    categoryChipText: {
        fontSize: 12,
        color: '#56409e',
        fontWeight: '500',
    },
    queueInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 24,
        marginTop: 24,
        alignItems: 'center',
        elevation: 2,
    },
    queueNumberContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    queueLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#281b52',
    },
    queueNumber: {
        fontSize: 48,
        fontWeight: '700',
        color: '#56409e',
        marginTop: 8,
    },
    queueDetailsContainer: {
        width: '100%',
        marginBottom: 24,
    },
    queueDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    queueDetailText: {
        marginLeft: 16,
    },
    queueDetailLabel: {
        fontSize: 14,
        color: '#9992a7',
    },
    queueDetailValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#281b52',
    },
    cancelButton: {
        backgroundColor: '#ffebee',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#f44336',
    },
    joinQueueContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 24,
        marginTop: 24,
        alignItems: 'center',
        elevation: 2,
    },
    joinQueueTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#281b52',
        marginBottom: 8,
    },
    joinQueueSubtitle: {
        fontSize: 14,
        color: '#9992a7',
        textAlign: 'center',
        marginBottom: 24,
    },
    joinButton: {
        backgroundColor: '#56409e',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    disabledButton: {
        backgroundColor: '#d8dffe',
    },
    buttonIcon: {
        marginRight: 8,
    },
    joinButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    infoSection: {
        marginHorizontal: 24,
        marginTop: 24,
        marginBottom: 32,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#281b52',
        marginBottom: 16,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    infoTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    infoItemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#281b52',
        marginBottom: 4,
    },
    infoItemText: {
        fontSize: 14,
        color: '#9992a7',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 8,
    },
});