import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';

export default function ForgotPasswordPage() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }
        
        try {
            setLoading(true);
            await auth.sendPasswordResetEmail(email);
            setResetSent(true);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]} edges={['top']}>
            <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <TouchableOpacity 
                            style={[styles.backButton, { backgroundColor: theme.card }]} 
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="arrow-left" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.appName, { color: theme.primary }]}>RetsuTomo</Text>
                        <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                            {resetSent 
                                ? 'Check your email for reset instructions' 
                                : 'Enter your email to receive a password reset link'}
                        </Text>
                    </View>
                    
                    {resetSent ? (
                        <View style={styles.successContainer}>
                            <View style={[styles.successIcon, { backgroundColor: theme.primaryLight }]}>
                                <Icon name="email-check" size={40} color={theme.primary} />
                            </View>
                            <Text style={[styles.successTitle, { color: theme.text }]}>Email Sent!</Text>
                            <Text style={[styles.successText, { color: theme.secondaryText }]}>
                                We've sent password reset instructions to {email}. Please check your inbox.
                            </Text>
                            <TouchableOpacity 
                                style={[styles.button, { backgroundColor: theme.primary }]} 
                                onPress={() => navigation.navigate('LoginPage')}
                            >
                                <Text style={styles.buttonText}>Back to Login</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.formContainer}>
                            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Icon name="email-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Email"
                                    placeholderTextColor={theme.secondaryText}
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                />
                            </View>
                            
                            <TouchableOpacity 
                                style={[styles.button, { backgroundColor: theme.primary }]} 
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Text style={styles.buttonText}>Sending...</Text>
                                ) : (
                                    <Text style={styles.buttonText}>Reset Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                    
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.secondaryText }]}>
                            Remember your password?
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('LoginPage')}>
                            <Text style={[styles.loginLink, { color: theme.primary }]}>Log In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    header: {
        marginTop: 40,
        marginBottom: 40,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: -10,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        textAlign: 'center',
        marginTop: 8,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        height: 56,
    },
    inputIcon: {
        marginLeft: 16,
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingRight: 16,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
        paddingVertical: 16,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '400',
        marginRight: 4,
    },
    loginLink: {
        fontSize: 14,
        fontWeight: '600',
    },
});