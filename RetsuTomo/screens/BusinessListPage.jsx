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
    ActivityIndicator,
} from 'react-native';
import { firestore } from '../services/firebase';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import sampleDataService from '../services/sampleData';

export default function BusinessListPage() {
    const [businesses, setBusinesses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredBusinesses, setFilteredBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const navigation = useNavigation();

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                setLoading(true);
                
                // Check if we need to populate sample data
                const snapshot = await firestore.collection('businesses').limit(1).get();
                if (snapshot.empty) {
                    await sampleDataService.populateSampleData();
                }
                
                // Fetch businesses
                const businessSnapshot = await firestore.collection('businesses').get();
                const businessData = businessSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                
                // Extract unique categories
                const uniqueCategories = ['All', ...new Set(businessData.map(business => business.category).filter(Boolean))];
                
                setBusinesses(businessData);
                setFilteredBusinesses(businessData);
                setCategories(uniqueCategories);
            } catch (error) {
                console.error('Error fetching businesses:', error);
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinesses();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        filterBusinesses(query, selectedCategory);
    };
    
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        filterBusinesses(searchQuery, category);
    };
    
    const filterBusinesses = (query, category) => {
        let filtered = businesses;
        
        // Apply category filter
        if (category && category !== 'All') {
            filtered = filtered.filter(business => business.category === category);
        }
        
        // Apply search query filter
        if (query.trim() !== '') {
            filtered = filtered.filter(business =>
                business.name.toLowerCase().includes(query.toLowerCase()) ||
                (business.description && business.description.toLowerCase().includes(query.toLowerCase()))
            );
        }
        
        setFilteredBusinesses(filtered);
    };

    const handleSelectBusiness = async (business) => {
        try {
            // Check if the business is open
            if (business.status !== 'open') {
                Alert.alert('Business Closed', 'This business is currently not accepting new queue entries.');
                return;
            }
            
            // Navigate to queue page
            navigation.navigate('QueuePage', { businessId: business.id, businessName: business.name });
        } catch (error) {
            console.error('Error selecting business:', error);
            Alert.alert('Error', 'Failed to select business');
        }
    };

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipSelected
            ]}
            onPress={() => handleCategorySelect(item)}
        >
            <Text 
                style={[
                    styles.categoryChipText,
                    selectedCategory === item && styles.categoryChipTextSelected
                ]}
            >
                {item}
            </Text>
        </TouchableOpacity>
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectBusiness(item)}
        >
            <View style={styles.cardContent}>
                <View style={[styles.businessIcon, { backgroundColor: getRandomColor(item.id) }]}>
                    <Text style={styles.businessIconText}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.businessInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardCategory}>{item.category || 'General'}</Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                    <View style={styles.businessStatusContainer}>
                        <View style={[
                            styles.statusIndicator, 
                            { backgroundColor: item.status === 'open' ? '#43A047' : '#F44336' }
                        ]} />
                        <Text style={styles.businessStatusText}>
                            {item.status === 'open' ? 'Open' : 'Closed'}
                        </Text>
                        {item.estimatedTimePerCustomer && (
                            <Text style={styles.estimatedTimeText}>
                                • ~{item.estimatedTimePerCustomer} mins per customer
                            </Text>
                        )}
                    </View>
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
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#56409e" />
                    <Text style={styles.loadingText}>Loading businesses...</Text>
                </View>
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
                <View style={styles.titleRow}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#281b52" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Businesses</Text>
                        <Text style={styles.subtitle}>Find and join queues</Text>
                    </View>
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
            
            {categories.length > 0 && (
                <FlatList
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={item => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryList}
                />
            )}
            
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
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        elevation: 2,
    },
    titleContainer: {
        flex: 1,
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
    categoryList: {
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    categoryChipSelected: {
        backgroundColor: '#56409e',
        borderColor: '#56409e',
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#281b52',
    },
    categoryChipTextSelected: {
        color: '#fff',
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
    cardCategory: {
        fontSize: 12,
        color: '#56409e',
        backgroundColor: '#f0eeff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    cardDescription: {
        fontSize: 14,
        fontWeight: '400',
        color: '#9992a7',
        marginTop: 4,
    },
    businessStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    businessStatusText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#281b52',
    },
    estimatedTimeText: {
        fontSize: 12,
        color: '#9992a7',
        marginLeft: 6,
    },
    cardAction: {
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#56409e',
        marginTop: 16,
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