import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
    StatusBar,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { auth } from '../services/firebase'; // Import Firebase auth
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';

export default function LoginPage() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        
        try {
            setLoading(true);
            await auth.signInWithEmailAndPassword(email, password);
            // Navigate to MainApp instead of DashboardPage to use the new tab navigation
            navigation.navigate('MainApp');
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
                        <Text style={[styles.appName, { color: theme.primary }]}>RetsuTomo</Text>
                        <Text style={[styles.title, { color: theme.text }]}>Welcome Back!</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Log in to continue</Text>
                    </View>
                    
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
                        
                        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Icon name="lock-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Password"
                                placeholderTextColor={theme.secondaryText}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity 
                                style={styles.passwordToggle}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Icon 
                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color={theme.secondaryText} 
                                />
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.forgotPasswordLink}
                            onPress={() => navigation.navigate('ForgotPasswordPage')}
                        >
                            <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot Password?</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.button, 
                                loading && styles.buttonDisabled,
                                { backgroundColor: loading ? theme.isDarkMode ? '#6b5bb6' : '#a99fd6' : theme.primary }
                            ]} 
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={styles.buttonText}>Logging in...</Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>Log In</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.secondaryText }]}>
                            Don't have an account?
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('RegisterPage')}>
                            <Text style={[styles.signUpLink, { color: theme.primary }]}>Sign Up</Text>
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
    passwordToggle: {
        padding: 16,
    },
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '500',
    },
    button: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
    },
    buttonDisabled: {
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
    signUpLink: {
        fontSize: 14,
        fontWeight: '600',
    },
});