import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    FlatList,
    Alert,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { firestore, auth } from '../services/firebase';

const Tab = createBottomTabNavigator();

function OngoingQueues() {
    const [ongoingQueues, setOngoingQueues] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
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
                    .where('status', '==', 'active')
                    .get();

                const ongoing = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setOngoingQueues(ongoing);
            } catch (error) {
                Alert.alert('Error', error.message);
                console.log(error.message)
            } finally {
                setLoading(false);
            }
        };

        fetchQueues();
    }, []);

    const renderQueueItem = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Queue Number: {item.queueNumber}</Text>
            <Text style={styles.cardDescription}>Business ID: {item.businessId}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={ongoingQueues}
                keyExtractor={item => item.id}
                renderItem={renderQueueItem}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No ongoing queues found.</Text>
                }
            />
        </SafeAreaView>
    );
}

function FinishedQueues() {
    const [finishedQueues, setFinishedQueues] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
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
                    .where('status', '==', 'finished')
                    .get();

                const finished = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setFinishedQueues(finished);
            } catch (error) {
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQueues();
    }, []);

    const renderQueueItem = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Queue Number: {item.queueNumber}</Text>
            <Text style={styles.cardDescription}>Business ID: {item.businessId}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={finishedQueues}
                keyExtractor={item => item.id}
                renderItem={renderQueueItem}
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No finished queues found.</Text>
                }
            />
        </SafeAreaView>
    );
}

export default function MyQueuesPage() {
    Icon.loadFont();
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: '#56409e' },
                tabBarActiveTintColor: '#fff',
                tabBarInactiveTintColor: '#d8dffe',
            }}
        >
            <Tab.Screen
                name="Ongoing"
                component={OngoingQueues}
                options={{
                    tabBarLabel: 'Ongoing',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="progress-clock" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Finished"
                component={FinishedQueues}
                options={{
                    tabBarLabel: 'Finished',
                    tabBarIcon: ({ color, size }) => (
                        <Icon name="check-circle-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
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
    emptyText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#9992a7',
        textAlign: 'center',
        marginTop: 16,
    },
});