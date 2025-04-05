import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TextInput,
    FlatList,
    TouchableOpacity,
    Alert,
    StatusBar,
    Image,
} from 'react-native';
import { firestore } from '../services/firebase';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function BusinessListPage() {
    const [businesses, setBusinesses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredBusinesses, setFilteredBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                setLoading(true);
                const snapshot = await firestore.collection('businesses').get();
                const businessData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setBusinesses(businessData);
                setFilteredBusinesses(businessData);
            } catch (error) {
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinesses();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredBusinesses(businesses);
        } else {
            const filtered = businesses.filter(business =>
                business.name.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredBusinesses(filtered);
        }
    };

    const handleSelectBusiness = (businessId) => {
        navigation.navigate('QueuePage', { businessId });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectBusiness(item.id)}
        >
            <View style={styles.cardContent}>
                <View style={[styles.businessIcon, { backgroundColor: getRandomColor(item.id) }]}>
                    <Text style={styles.businessIconText}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.businessInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
            </View>
            <View style={styles.cardAction}>
                <Icon name="chevron-right" size={24} color="#9992a7" />
            </View>
        </TouchableOpacity>
    );

    // Generate a consistent color based on business ID
    const getRandomColor = (id) => {
        const colors = ['#6C63FF', '#FF6584', '#43A047', '#FB8C00', '#5C6BC0', '#26A69A'];
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            {loading ? (
                <Text style={styles.emptyText}>Loading businesses...</Text>
            ) : (
                <>
                    <Icon name="store-search" size={60} color="#d8dffe" />
                    <Text style={styles.emptyTitle}>No businesses found</Text>
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'Try a different search term' : 'Businesses will appear here'}
                    </Text>
                </>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Businesses</Text>
                    <Text style={styles.subtitle}>Find and join queues</Text>
                </View>
            </View>
            
            <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color="#9992a7" style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Search for a business"
                    placeholderTextColor="#9992a7"
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => handleSearch('')}
                    >
                        <Icon name="close-circle" size={16} color="#9992a7" />
                    </TouchableOpacity>
                )}
            </View>
            
            <FlatList
                data={filteredBusinesses}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={renderEmptyList}
                showsVerticalScrollIndicator={false}
            />
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
        paddingTop: 20,
        paddingBottom: 10,
    },
    titleContainer: {
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#281b52',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#9992a7',
        marginTop: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 24,
        marginVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#281b52',
    },
    clearButton: {
        padding: 4,
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    businessIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    businessIconText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    businessInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#281b52',
    },
    cardDescription: {
        fontSize: 14,
        fontWeight: '400',
        color: '#9992a7',
        marginTop: 4,
    },
    cardAction: {
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#281b52',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9992a7',
        textAlign: 'center',
    },
});