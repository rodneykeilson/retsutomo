import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { auth, firestore } from '../services/firebase';

export default function ManageBusinessesPage() {
    const [businessName, setBusinessName] = useState('');
    const [businessDescription, setBusinessDescription] = useState('');
    const [isBusinessRegistered, setIsBusinessRegistered] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBusinessData = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    const profileDoc = await firestore.collection('profiles').doc(user.uid).get();
                    if (profileDoc.exists && profileDoc.data().business) {
                        setIsBusinessRegistered(true);
                        setBusinessName(profileDoc.data().business.name);
                        setBusinessDescription(profileDoc.data().business.description);
                    }
                }
            } catch (error) {
                Alert.alert('Error', error.message);
            }
        };

        fetchBusinessData();
    }, []);

    const handleRegisterBusiness = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (user) {
                await firestore.collection('profiles').doc(user.uid).update({
                    business: {
                        name: businessName,
                        description: businessDescription,
                    },
                });
                setIsBusinessRegistered(true);
                Alert.alert('Success', 'Business registered successfully!');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manage Businesses</Text>
                <Text style={styles.subtitle}>
                    {isBusinessRegistered
                        ? 'Your registered business details'
                        : 'Register your business to start managing queues'}
                </Text>
            </View>
            <View style={styles.form}>
                {isBusinessRegistered ? (
                    <>
                        <Text style={styles.label}>Business Name</Text>
                        <Text style={styles.value}>{businessName}</Text>
                        <Text style={styles.label}>Description</Text>
                        <Text style={styles.value}>{businessDescription}</Text>
                    </>
                ) : (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Business Name"
                            placeholderTextColor="#9992a7"
                            value={businessName}
                            onChangeText={setBusinessName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Business Description"
                            placeholderTextColor="#9992a7"
                            value={businessDescription}
                            onChangeText={setBusinessDescription}
                        />
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleRegisterBusiness}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Registering...' : 'Register Business'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
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
    form: {
        flex: 1,
        justifyContent: 'center',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#281b52',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#d8dffe',
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
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#281b52',
        marginBottom: 8,
    },
    value: {
        fontSize: 16,
        fontWeight: '400',
        color: '#9992a7',
        marginBottom: 16,
    },
});