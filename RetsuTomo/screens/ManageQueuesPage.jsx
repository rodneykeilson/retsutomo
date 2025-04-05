import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    Modal,
} from 'react-native';
import { firestore, auth } from '../services/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ManageQueuesPage({ navigation }) {
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [selectedBusinessId, setSelectedBusinessId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showBusinessSelector, setShowBusinessSelector] = useState(false);

    useEffect(() => {
        fetchUserBusinesses();
    }, []);

    useEffect(() => {
        if (selectedBusinessId) {
            fetchQueues(selectedBusinessId);
        }
    }, [selectedBusinessId]);

    const fetchUserBusinesses = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to manage queues.');
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
            }
        } catch (error) {
            console.error('Error fetching businesses:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchQueues = async (businessId) => {
        try {
            setRefreshing(true);
            
            // Fetch active queues for the selected business
            const snapshot = await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .where('status', '==', 'active')
                .orderBy('createdAt', 'asc')
                .get();

            const queueData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            
            setQueues(queueData);
        } catch (error) {
            console.error('Error fetching queues:', error);
            Alert.alert('Error', error.message);
        } finally {
            setRefreshing(false);
        }
    };

    const handleMarkAsFinished = async (queueId) => {
        try {
            setLoading(true);
            if (!selectedBusinessId) {
                Alert.alert('Error', 'No business selected.');
                return;
            }

            // Check if the queue document exists
            const queueDoc = await firestore
                .collection('businesses')
                .doc(selectedBusinessId)
                .collection('queues')
                .doc(queueId)
                .get();

            if (!queueDoc.exists) {
                Alert.alert('Error', 'Queue not found.');
                return;
            }

            // Update the queue status to "finished"
            await firestore
                .collection('businesses')
                .doc(selectedBusinessId)
                .collection('queues')
                .doc(queueId)
                .update({
                    status: 'finished',
                    finishedAt: new Date()
                });

            // Remove the queue from the local state
            setQueues(prevQueues => prevQueues.filter(queue => queue.id !== queueId));

            Alert.alert('Success', 'Queue marked as finished.');
        } catch (error) {
            console.error('Error updating queue:', error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectBusiness = (business) => {
        setSelectedBusiness(business);
        setSelectedBusinessId(business.id);
        setShowBusinessSelector(false);
    };

    const handleRefresh = () => {
        if (selectedBusinessId) {
            fetchQueues(selectedBusinessId);
        }
    };

    const renderQueueItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Queue #{item.queueNumber}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: '#56409e' }
                ]}>
                    <Text style={styles.statusText}>Active</Text>
                </View>
            </View>
            
            <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                    <Icon name="account" size={16} color="#281b52" style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                        {item.userName || 'Anonymous User'}
                    </Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Icon name="clock-outline" size={16} color="#281b52" style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                        {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString() : 'Unknown time'}
                    </Text>
                </View>
                
                {item.notes && (
                    <View style={styles.infoRow}>
                        <Icon name="note-text-outline" size={16} color="#281b52" style={styles.infoIcon} />
                        <Text style={styles.infoText}>{item.notes}</Text>
                    </View>
                )}
            </View>
            
            <TouchableOpacity
                style={styles.finishButton}
                onPress={() => handleMarkAsFinished(item.id)}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <Icon name="check" size={16} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Mark as Finished</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

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
        </TouchableOpacity>
    );

    // Generate a consistent color based on business ID
    const getRandomColor = (id) => {
        const colors = ['#6C63FF', '#FF6584', '#43A047', '#FB8C00', '#5C6BC0', '#26A69A'];
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    if (loading && businesses.length === 0) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#56409e" />
                <Text style={styles.loadingText}>Loading business data...</Text>
            </SafeAreaView>
        );
    }

    if (businesses.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
                <View style={styles.header}>
                    <Text style={styles.title}>Manage Queues</Text>
                    <Text style={styles.subtitle}>No businesses found</Text>
                </View>
                <View style={styles.emptyStateContainer}>
                    <Icon name="store-off" size={80} color="#d8dffe" />
                    <Text style={styles.emptyStateText}>
                        You don't have any businesses yet
                    </Text>
                    <TouchableOpacity
                        style={styles.createBusinessButton}
                        onPress={() => navigation.navigate('ManageBusinesses')}
                    >
                        <Icon name="store-plus" size={20} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.createBusinessButtonText}>
                            Create Business
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            
            <View style={styles.header}>
                <Text style={styles.title}>Manage Queues</Text>
                
                <TouchableOpacity 
                    style={styles.businessSelector}
                    onPress={() => setShowBusinessSelector(true)}
                >
                    <Text style={styles.businessSelectorText}>
                        {selectedBusiness?.name || 'Select Business'}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#56409e" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <ActivityIndicator size="small" color="#56409e" />
                    ) : (
                        <Icon name="refresh" size={20} color="#56409e" />
                    )}
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => navigation.navigate('ManageBusinesses')}
                >
                    <Icon name="store-settings" size={16} color="#56409e" style={styles.buttonIcon} />
                    <Text style={styles.manageButtonText}>Manage Businesses</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={queues}
                keyExtractor={item => item.id}
                renderItem={renderQueueItem}
                contentContainerStyle={styles.list}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyStateContainer}>
                        <Icon name="account-multiple-outline" size={80} color="#d8dffe" />
                        <Text style={styles.emptyStateText}>
                            No active queues found
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                            Customers will appear here when they join your queue
                        </Text>
                    </View>
                }
            />
            
            {/* Business Selector Modal */}
            <Modal
                visible={showBusinessSelector}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowBusinessSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Business</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowBusinessSelector(false)}
                            >
                                <Icon name="close" size={24} color="#281b52" />
                            </TouchableOpacity>
                        </View>
                        
                        <FlatList
                            data={businesses}
                            keyExtractor={item => item.id}
                            renderItem={renderBusinessItem}
                            contentContainerStyle={styles.businessListContent}
                        />
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
    businessSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 8,
    },
    businessSelectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#56409e',
        marginRight: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0eeff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#f0eeff',
        borderRadius: 20,
    },
    manageButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#56409e',
    },
    buttonIcon: {
        marginRight: 8,
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#281b52',
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#fff',
    },
    cardContent: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoIcon: {
        marginRight: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#281b52',
    },
    finishButton: {
        backgroundColor: '#56409e',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#281b52',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9992a7',
        marginTop: 8,
        textAlign: 'center',
    },
    createBusinessButton: {
        backgroundColor: '#56409e',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 24,
    },
    createBusinessButtonText: {
        color: '#fff',
        fontSize: 14,
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
    businessListContent: {
        padding: 16,
    },
    businessItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
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
});