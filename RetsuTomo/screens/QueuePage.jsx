import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    StatusBar,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';

export default function QueuePage() {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { businessId, businessName: routeBusinessName } = route.params;
    
    const [business, setBusiness] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    
    useEffect(() => {
        const fetchBusinessData = async () => {
            try {
                setLoading(true);
                
                // Fetch business details
                const businessDoc = await firestore.collection('businesses').doc(businessId).get();
                if (!businessDoc.exists) {
                    Alert.alert('Error', 'Business not found');
                    navigation.goBack();
                    return;
                }
                
                setBusiness(businessDoc.data());
                
                // Check if user is already in queue
                const user = auth.currentUser;
                if (user) {
                    const queueSnapshot = await firestore
                        .collection('businesses')
                        .doc(businessId)
                        .collection('queues')
                        .where('userId', '==', user.uid)
                        .where('status', 'in', ['waiting', 'current'])
                        .get();
                    
                    if (!queueSnapshot.empty) {
                        const queueData = {
                            id: queueSnapshot.docs[0].id,
                            ...queueSnapshot.docs[0].data(),
                        };
                        setQueueStatus(queueData);
                    }
                }
            } catch (error) {
                console.error('Error fetching business data:', error);
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchBusinessData();
    }, [businessId, navigation]);
    
    const handleJoinQueue = async () => {
        try {
            setJoining(true);
            
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to join a queue');
                navigation.navigate('LoginPage');
                return;
            }
            
            // Check if business is open
            if (business.status !== 'open') {
                Alert.alert('Business Closed', 'This business is not currently accepting new queue entries.');
                return;
            }
            
            // Check if user is already in queue
            const existingQueueSnapshot = await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .where('userId', '==', user.uid)
                .where('status', 'in', ['waiting', 'current'])
                .get();
            
            if (!existingQueueSnapshot.empty) {
                Alert.alert('Already in Queue', 'You are already in the queue for this business.');
                return;
            }
            
            // Get current queue length
            const queueSnapshot = await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .where('status', 'in', ['waiting', 'current'])
                .get();
            
            const queueLength = queueSnapshot.size;
            
            // Add user to queue
            const queueRef = await firestore.collection('businesses').doc(businessId).collection('queues').add({
                userId: user.uid,
                status: 'waiting',
                position: queueLength + 1,
                joinedAt: new Date(),
                estimatedWaitTime: (queueLength + 1) * (business.estimatedTimePerCustomer || 5),
            });
            
            // Get the queue data
            const queueDoc = await queueRef.get();
            setQueueStatus({
                id: queueDoc.id,
                ...queueDoc.data(),
            });
            
            // Update business queue count
            await firestore.collection('businesses').doc(businessId).update({
                currentQueueLength: (business.currentQueueLength || 0) + 1,
            });
            
            // Update local business data
            setBusiness({
                ...business,
                currentQueueLength: (business.currentQueueLength || 0) + 1,
            });
            
            Alert.alert('Success', 'You have joined the queue!');
        } catch (error) {
            console.error('Error joining queue:', error);
            Alert.alert('Error', error.message);
        } finally {
            setJoining(false);
        }
    };
    
    const handleLeaveQueue = async () => {
        try {
            setLeaving(true);
            
            if (!queueStatus || !queueStatus.id) {
                Alert.alert('Error', 'Queue entry not found');
                return;
            }
            
            // Update queue status to 'cancelled'
            await firestore.collection('businesses').doc(businessId).collection('queues').doc(queueStatus.id).update({
                status: 'cancelled',
                leftAt: new Date(),
            });
            
            // Update business queue count
            await firestore.collection('businesses').doc(businessId).update({
                currentQueueLength: Math.max((business.currentQueueLength || 0) - 1, 0),
            });
            
            // Update local business data
            setBusiness({
                ...business,
                currentQueueLength: Math.max((business.currentQueueLength || 0) - 1, 0),
            });
            
            // Clear queue status
            setQueueStatus(null);
            
            Alert.alert('Success', 'You have left the queue');
        } catch (error) {
            console.error('Error leaving queue:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLeaving(false);
        }
    };
    
    if (loading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: insets.top }]} edges={['top']}>
                <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]} edges={['top']}>
            <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.backButton, { backgroundColor: theme.card }]} 
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{business?.name || routeBusinessName}</Text>
                <View style={styles.placeholder} />
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.businessCard, { backgroundColor: theme.card }]}>
                    <View style={styles.businessHeader}>
                        <View style={[styles.businessIconContainer, { backgroundColor: theme.primaryLight }]}>
                            <Icon name="store" size={24} color={theme.primary} />
                        </View>
                        <View style={styles.businessInfo}>
                            <Text style={[styles.businessName, { color: theme.text }]}>{business?.name}</Text>
                            <View style={styles.businessMeta}>
                                <View style={[styles.categoryBadge, { backgroundColor: theme.primaryLight }]}>
                                    <Text style={[styles.categoryBadgeText, { color: theme.primary }]}>
                                        {business?.category || 'General'}
                                    </Text>
                                </View>
                                <Text style={[
                                    styles.businessStatus, 
                                    { color: business?.status === 'open' ? theme.success : theme.error }
                                ]}>
                                    {business?.status === 'open' ? 'Open' : 'Closed'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    
                    {business?.description && (
                        <Text style={[styles.businessDescription, { color: theme.secondaryText }]}>
                            {business.description}
                        </Text>
                    )}
                    
                    <View style={styles.businessStats}>
                        <View style={styles.statItem}>
                            <Icon name="account-multiple" size={20} color={theme.secondaryText} />
                            <Text style={[styles.statText, { color: theme.secondaryText }]}>
                                {business?.currentQueueLength || 0} in queue
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Icon name="clock-outline" size={20} color={theme.secondaryText} />
                            <Text style={[styles.statText, { color: theme.secondaryText }]}>
                                ~{business?.estimatedTimePerCustomer || 5} min per customer
                            </Text>
                        </View>
                    </View>
                </View>
                
                {queueStatus ? (
                    <View style={[styles.queueStatusCard, { backgroundColor: theme.card }]}>
                        <View style={styles.queueStatusHeader}>
                            <Text style={[styles.queueStatusTitle, { color: theme.text }]}>Your Queue Status</Text>
                            <View style={[
                                styles.queueStatusBadge,
                                { 
                                    backgroundColor: queueStatus.status === 'current' 
                                        ? theme.success 
                                        : theme.warning 
                                }
                            ]}>
                                <Text style={styles.queueStatusBadgeText}>
                                    {queueStatus.status === 'current' ? 'Your Turn' : 'Waiting'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.queueDetails}>
                            <View style={styles.queueDetailItem}>
                                <Text style={[styles.queueDetailLabel, { color: theme.secondaryText }]}>Position</Text>
                                <Text style={[styles.queueDetailValue, { color: theme.text }]}>
                                    {queueStatus.status === 'current' ? 'Now Serving' : `#${queueStatus.position}`}
                                </Text>
                            </View>
                            
                            <View style={styles.queueDetailItem}>
                                <Text style={[styles.queueDetailLabel, { color: theme.secondaryText }]}>Estimated Wait</Text>
                                <Text style={[styles.queueDetailValue, { color: theme.text }]}>
                                    {queueStatus.status === 'current' 
                                        ? 'It\'s your turn!' 
                                        : `~${queueStatus.estimatedWaitTime} minutes`}
                                </Text>
                            </View>
                            
                            <View style={styles.queueDetailItem}>
                                <Text style={[styles.queueDetailLabel, { color: theme.secondaryText }]}>Joined At</Text>
                                <Text style={[styles.queueDetailValue, { color: theme.text }]}>
                                    {queueStatus.joinedAt?.toDate().toLocaleTimeString()}
                                </Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.leaveQueueButton, { backgroundColor: theme.error }]}
                            onPress={handleLeaveQueue}
                            disabled={leaving}
                        >
                            {leaving ? (
                                <Text style={styles.buttonText}>Leaving Queue...</Text>
                            ) : (
                                <Text style={styles.buttonText}>Leave Queue</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.joinQueueCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.joinQueueTitle, { color: theme.text }]}>Ready to Join?</Text>
                        <Text style={[styles.joinQueueDescription, { color: theme.secondaryText }]}>
                            Join the queue to secure your spot. You'll be notified when it's your turn.
                        </Text>
                        
                        <TouchableOpacity 
                            style={[
                                styles.joinQueueButton, 
                                { 
                                    backgroundColor: business?.status === 'open' ? theme.primary : theme.isDarkMode ? '#555555' : '#cccccc',
                                }
                            ]}
                            onPress={handleJoinQueue}
                            disabled={joining || business?.status !== 'open'}
                        >
                            {joining ? (
                                <Text style={styles.buttonText}>Joining Queue...</Text>
                            ) : (
                                <Text style={styles.buttonText}>
                                    {business?.status === 'open' ? 'Join Queue' : 'Business Closed'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                
                <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
                    <View style={styles.infoHeader}>
                        <Icon name="information-outline" size={24} color={theme.primary} />
                        <Text style={[styles.infoTitle, { color: theme.text }]}>How Queuing Works</Text>
                    </View>
                    
                    <View style={styles.infoSteps}>
                        <View style={styles.infoStep}>
                            <View style={[styles.infoStepIcon, { backgroundColor: theme.primaryLight }]}>
                                <Text style={[styles.infoStepIconText, { color: theme.primary }]}>1</Text>
                            </View>
                            <View style={styles.infoStepContent}>
                                <Text style={[styles.infoStepTitle, { color: theme.text }]}>Join the Queue</Text>
                                <Text style={[styles.infoStepDescription, { color: theme.secondaryText }]}>
                                    Tap the Join Queue button to secure your spot
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.infoStep}>
                            <View style={[styles.infoStepIcon, { backgroundColor: theme.primaryLight }]}>
                                <Text style={[styles.infoStepIconText, { color: theme.primary }]}>2</Text>
                            </View>
                            <View style={styles.infoStepContent}>
                                <Text style={[styles.infoStepTitle, { color: theme.text }]}>Wait for Your Turn</Text>
                                <Text style={[styles.infoStepDescription, { color: theme.secondaryText }]}>
                                    You'll see your position and estimated wait time
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.infoStep}>
                            <View style={[styles.infoStepIcon, { backgroundColor: theme.primaryLight }]}>
                                <Text style={[styles.infoStepIconText, { color: theme.primary }]}>3</Text>
                            </View>
                            <View style={styles.infoStepContent}>
                                <Text style={[styles.infoStepTitle, { color: theme.text }]}>Get Notified</Text>
                                <Text style={[styles.infoStepDescription, { color: theme.secondaryText }]}>
                                    You'll be notified when it's your turn
                                </Text>
                            </View>
                        </View>
                    </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
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
        marginBottom: 12,
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
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    businessStatus: {
        fontSize: 14,
        fontWeight: '500',
    },
    businessDescription: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    businessStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        fontSize: 14,
        marginLeft: 4,
    },
    queueStatusCard: {
        borderRadius: 16,
        padding: 16,
        margin: 16,
        marginTop: 0,
        elevation: 2,
    },
    queueStatusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    queueStatusTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    queueStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    queueStatusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    queueDetails: {
        marginBottom: 16,
    },
    queueDetailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    queueDetailLabel: {
        fontSize: 14,
    },
    queueDetailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    leaveQueueButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    joinQueueCard: {
        borderRadius: 16,
        padding: 16,
        margin: 16,
        marginTop: 0,
        elevation: 2,
    },
    joinQueueTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    joinQueueDescription: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    joinQueueButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    infoCard: {
        borderRadius: 16,
        padding: 16,
        margin: 16,
        marginTop: 0,
        marginBottom: 32,
        elevation: 2,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    infoSteps: {
    },
    infoStep: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    infoStepIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoStepIconText: {
        fontSize: 16,
        fontWeight: '700',
    },
    infoStepContent: {
        flex: 1,
    },
    infoStepTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    infoStepDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
});