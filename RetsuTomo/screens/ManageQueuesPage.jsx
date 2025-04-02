import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { firestore, auth } from '../services/firebase';

export default function ManageQueuesPage() {
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [businessId, setBusinessId] = useState(null);

    useEffect(() => {
        const fetchQueues = async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) {
                    Alert.alert('Error', 'You must be logged in to manage queues.');
                    return;
                }

                // Fetch the business ID from the user's profile
                const profileDoc = await firestore.collection('profiles').doc(user.uid).get();
                if (profileDoc.exists && profileDoc.data().businessId) {
                    const businessId = profileDoc.data().businessId;
                    setBusinessId(businessId);

                    // Fetch active queues for the business
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
                } else {
                    Alert.alert('Error', 'No business found for this account.');
                }
            } catch (error) {
                Alert.alert('Error', error.message);
                console.log(error.message)
            } finally {
                setLoading(false);
            }
        };

        fetchQueues();
    }, []);

    const handleMarkAsFinished = async (queueId) => {
        try {
            setLoading(true);
            if (!businessId) {
                Alert.alert('Error', 'No business associated with this account.');
                return;
            }

            // Update the queue status to "finished"
            await firestore
                .collection('businesses')
                .doc(businessId)
                .collection('queues')
                .doc(queueId)
                .update({
                    status: 'finished',
                });

            // Remove the queue from the local state
            setQueues(prevQueues => prevQueues.filter(queue => queue.id !== queueId));

            Alert.alert('Success', 'Queue marked as finished.');
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Queue Number: {item.queueNumber}</Text>
            <Text style={styles.cardDescription}>User ID: {item.userId}</Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => handleMarkAsFinished(item.id)}
                disabled={loading}
            >
                <Text style={styles.buttonText}>Mark as Finished</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manage Queues</Text>
                <Text style={styles.subtitle}>View and manage your active queues</Text>
            </View>
            <FlatList
                data={queues}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No active queues found.</Text>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    header: {
        marginBottom: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#281b52',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#9992a7',
        textAlign: 'center',
        marginTop: 8,
    },
    list: {
        marginTop: 16,
    },
    card: {
        backgroundColor: '#d8dffe',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#281b52',
    },
    cardDescription: {
        fontSize: 14,
        fontWeight: '400',
        color: '#9992a7',
        marginTop: 4,
    },
    button: {
        backgroundColor: '#56409e',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#9992a7',
        textAlign: 'center',
        marginTop: 32,
    },
});