import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
    Image,
    ScrollView,
    StatusBar,
} from 'react-native';
import { auth, firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

export default function ProfilePage() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    setEmail(user.email);
                    const profileDoc = await firestore.collection('profiles').doc(user.uid).get();
                    if (profileDoc.exists) {
                        setName(profileDoc.data().name);
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
                setIsEditing(false);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            navigation.reset({
                index: 0,
                routes: [{ name: 'LandingPage' }],
            });
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const renderProfileHeader = () => (
        <View style={[styles.profileHeader, { backgroundColor: theme.card }]}>
            <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
                </View>
            </View>
            <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>{name || 'User'}</Text>
                <Text style={[styles.profileEmail, { color: theme.secondaryText }]}>{email}</Text>
            </View>
            {!isEditing && (
                <TouchableOpacity 
                    style={[styles.editButton, { backgroundColor: theme.primaryLight }]} 
                    onPress={() => setIsEditing(true)}
                >
                    <Icon name="pencil" size={20} color={theme.primary} />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderEditForm = () => (
        <View style={[styles.editForm, { backgroundColor: theme.card }]}>
            <Text style={[styles.formLabel, { color: theme.primary }]}>Name</Text>
            <TextInput
                style={[styles.input, { 
                    backgroundColor: theme.background, 
                    color: theme.text,
                    borderColor: theme.border 
                }]}
                placeholder="Your name"
                placeholderTextColor={theme.secondaryText}
                value={name}
                onChangeText={setName}
            />
            
            <Text style={[styles.formLabel, { color: theme.primary }]}>Email</Text>
            <TextInput
                style={[
                    styles.input, 
                    styles.disabledInput, 
                    { 
                        backgroundColor: theme.isDarkMode ? '#2a2a2a' : '#f0f0f0',
                        color: theme.secondaryText,
                        borderColor: theme.border
                    }
                ]}
                value={email}
                editable={false}
            />
            
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[
                        styles.button, 
                        styles.cancelButton, 
                        { backgroundColor: theme.isDarkMode ? '#2a2a2a' : '#f0f0f0' }
                    ]}
                    onPress={() => setIsEditing(false)}
                >
                    <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }]}
                    onPress={handleSaveProfile}
                    disabled={loading}
                >
                    <Text style={styles.saveButtonText}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderProfileOptions = () => (
        <View style={[styles.optionsContainer, { backgroundColor: theme.card }]}>
            {/* Theme Toggle Option */}
            <ThemeToggle />
            
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]}>
                <View style={[styles.optionIconContainer, { backgroundColor: theme.primaryLight }]}>
                    <Icon name="bell-outline" size={24} color={theme.primary} />
                </View>
                <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: theme.text }]}>Notifications</Text>
                    <Text style={[styles.optionDescription, { color: theme.secondaryText }]}>Manage your notification preferences</Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.secondaryText} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]}>
                <View style={[styles.optionIconContainer, { backgroundColor: theme.primaryLight }]}>
                    <Icon name="shield-outline" size={24} color={theme.primary} />
                </View>
                <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: theme.text }]}>Privacy</Text>
                    <Text style={[styles.optionDescription, { color: theme.secondaryText }]}>Manage your privacy settings</Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.secondaryText} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.optionItem, { borderBottomColor: theme.border }]}>
                <View style={[styles.optionIconContainer, { backgroundColor: theme.primaryLight }]}>
                    <Icon name="help-circle-outline" size={24} color={theme.primary} />
                </View>
                <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: theme.text }]}>Help & Support</Text>
                    <Text style={[styles.optionDescription, { color: theme.secondaryText }]}>Get help with the app</Text>
                </View>
                <Icon name="chevron-right" size={24} color={theme.secondaryText} />
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.optionItem, styles.signOutOption]}
                onPress={handleSignOut}
            >
                <View style={[styles.optionIconContainer, styles.signOutIcon]}>
                    <Icon name="logout" size={24} color="#FF6584" />
                </View>
                <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, styles.signOutText]}>Sign Out</Text>
                </View>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
                </View>
                
                {renderProfileHeader()}
                
                {isEditing ? renderEditForm() : renderProfileOptions()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
    },
    profileEmail: {
        fontSize: 14,
        marginTop: 4,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editForm: {
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    disabledInput: {
        backgroundColor: '#f0f0f0',
        color: '#9992a7',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    button: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        flex: 1,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: '#56409e',
        marginLeft: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    optionsContainer: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        elevation: 2,
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    optionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    optionDescription: {
        fontSize: 14,
        marginTop: 2,
    },
    signOutOption: {
        borderBottomWidth: 0,
    },
    signOutIcon: {
        backgroundColor: '#ffebee',
    },
    signOutText: {
        color: '#FF6584',
    },
});