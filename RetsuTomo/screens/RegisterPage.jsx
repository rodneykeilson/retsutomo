import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { auth } from '../services/firebase';

export default function RegisterPage() {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignUp = async () => {
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            Alert.alert('Success', 'Account created successfully!');
            navigation.navigate('LoginPage');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Create an Account</Text>
                <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>
            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9992a7"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9992a7"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.button} onPress={handleSignUp}>
                    <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Already have an account?{' '}
                    <Text onPress={() => navigation.navigate('LoginPage')} style={styles.link}>Log In</Text>
                </Text>
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
    link: {
        fontSize: 14,
        fontWeight: '500',
        color: '#56409e',
        textAlign: 'center',
        marginTop: 8,
    },
    footer: {
        alignItems: 'center',
        marginTop: 16,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#9992a7',
    },
});