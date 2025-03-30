import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
} from 'react-native';

export default function LoginPage() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>Log in to continue</Text>
            </View>
            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9992a7"
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9992a7"
                    secureTextEntry
                />
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Log In</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text style={styles.link}>Forgot Password?</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Don't have an account?{' '}
                    <Text style={styles.link}>Sign Up</Text>
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