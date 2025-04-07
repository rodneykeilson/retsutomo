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
import { auth, firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';

export default function RegisterPage() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        
        try {
            setLoading(true);
            // Create user with email and password
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Save additional user data to Firestore
            await firestore.collection('profiles').doc(userCredential.user.uid).set({
                name,
                email,
                createdAt: new Date(),
            });
            
            // Navigate to MainApp
            navigation.navigate('MainApp');
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
                        <Text style={[styles.appName, { color: theme.primary }]}>RetsuTomo</Text>
                        <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Sign up to get started</Text>
                    </View>
                    
                    <View style={styles.formContainer}>
                        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Icon name="account-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Full Name"
                                placeholderTextColor={theme.secondaryText}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                        
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
                        
                        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Icon name="lock-check-outline" size={20} color={theme.secondaryText} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Confirm Password"
                                placeholderTextColor={theme.secondaryText}
                                secureTextEntry={!showConfirmPassword}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity 
                                style={styles.passwordToggle}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Icon 
                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color={theme.secondaryText}
                                />
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.button, { backgroundColor: theme.primary }]} 
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <Text style={styles.buttonText}>Creating Account...</Text>
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.secondaryText }]}>
                            Already have an account?
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
    button: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
        elevation: 2,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
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