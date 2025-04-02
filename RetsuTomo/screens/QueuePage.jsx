import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { firebase } from '@react-native-firebase/app';
import { firestore, auth } from '../services/firebase';

export default function QueuePage({ route, navigation }) {
    const { businessId } = route.params;
    const [businessName, setBusinessName] = useState('');
    const [queueNumber, setQueueNumber] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBusinessDetails = async () => {
            try {
                const businessDoc = await firestore.collection('businesses').doc(businessId).get();
                if (businessDoc.exists) {
                    setBusinessName(businessDoc.data().name);
                } else {
                    Alert.alert('Error', 'Business not found.');
                    navigation.goBack();
                }
            } catch (error) {
                Alert.alert('Error', error.message);
            }
        };

        fetchBusinessDetails();
    }, [businessId]);


    const handleTakeQueue = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to take a queue.');
                return;
            }

            const queueRef = firestore.collection('businesses').doc(businessId).collection('queues');

            // Get the current active queues and determine the next queue number
            const snapshot = await queueRef.where('status', '==', 'active').get();
            const queueNumber = snapshot.size + 1; // Next queue number

            const newQueue = await queueRef.add({
                userId: user.uid,
                queueNumber: queueNumber,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            setQueueNumber(queueNumber);
            Alert.alert('Success', `You have taken a queue. Your queue number is ${queueNumber}`);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{businessName}</Text>
                <Text style={styles.subtitle}>Take your queue number</Text>
            </View>
            {queueNumber ? (
                <View style={styles.queueInfo}>
                    <Text style={styles.queueText}>Your Queue Number:</Text>
                    <Text style={styles.queueNumber}>{queueNumber}</Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleTakeQueue}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Processing...' : 'Take Queue'}
                    </Text>
                </TouchableOpacity>
            )}
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
        marginBottom: 32,
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
    button: {
        backgroundColor: '#56409e',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    queueInfo: {
        alignItems: 'center',
        marginTop: 32,
    },
    queueText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#281b52',
    },
    queueNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#56409e',
        marginTop: 8,
    },
});