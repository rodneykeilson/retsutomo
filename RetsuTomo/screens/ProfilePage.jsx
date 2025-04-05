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

export default function ProfilePage() {
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
            // Navigate to login page
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const renderProfileHeader = () => (
        <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
                </View>
            </View>
            <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{name || 'User'}</Text>
                <Text style={styles.profileEmail}>{email}</Text>
            </View>
            {!isEditing && (
                <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => setIsEditing(true)}
                >
                    <Icon name="pencil" size={20} color="#56409e" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderEditForm = () => (
        <View style={styles.editForm}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#9992a7"
                value={name}
                onChangeText={setName}
            />
            
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
                style={[styles.input, styles.disabledInput]}
                value={email}
                editable={false}
            />
            
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setIsEditing(false)}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
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
        <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionItem}>
                <View style={styles.optionIconContainer}>
                    <Icon name="bell-outline" size={24} color="#56409e" />
                </View>
                <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Notifications</Text>
                    <Text style={styles.optionDescription}>Manage your notification preferences</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9992a7" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem}>
                <View style={styles.optionIconContainer}>
                    <Icon name="shield-outline" size={24} color="#56409e" />
                </View>
                <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Privacy</Text>
                    <Text style={styles.optionDescription}>Manage your privacy settings</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9992a7" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem}>
                <View style={styles.optionIconContainer}>
                    <Icon name="help-circle-outline" size={24} color="#56409e" />
                </View>
                <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Help & Support</Text>
                    <Text style={styles.optionDescription}>Get help with the app</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9992a7" />
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
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
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
        backgroundColor: '#f5f5f5',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#281b52',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
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
        backgroundColor: '#d8dffe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#56409e',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#281b52',
    },
    profileEmail: {
        fontSize: 14,
        color: '#9992a7',
        marginTop: 4,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0eeff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editForm: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#56409e',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#281b52',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
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
        color: '#281b52',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    optionsContainer: {
        backgroundColor: '#fff',
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
        borderBottomColor: '#f0f0f0',
    },
    optionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0eeff',
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
        color: '#281b52',
    },
    optionDescription: {
        fontSize: 14,
        color: '#9992a7',
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