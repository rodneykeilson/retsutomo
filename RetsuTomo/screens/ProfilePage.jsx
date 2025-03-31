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

export default function ProfilePage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    setEmail(user.email); // Set email from the authenticated user
                    const profileDoc = await firestore.collection('profiles').doc(user.uid).get();
                    if (profileDoc.exists) {
                        setName(profileDoc.data().name); // Load name from Firestore
                    }
                }
            } catch (error) {
                Alert.alert('Error', error.message);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (user) {
                await firestore.collection('profiles').doc(user.uid).set({
                    name,
                    email,
                });
                Alert.alert('Success', 'Profile updated successfully!');
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
                <Text style={styles.title}>Profile</Text>
                <Text style={styles.subtitle}>Manage your account details</Text>
            </View>
            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Name"
                    placeholderTextColor="#9992a7"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9992a7"
                    value={email}
                    editable={false}
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSaveProfile}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
                </TouchableOpacity>
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
});