import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import sampleDataService from '../services/sampleData';

export default function BusinessListPage() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [businesses, setBusinesses] = useState([]);
    const [filteredBusinesses, setFilteredBusinesses] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            setLoading(true);
            
            // Check if we need to populate sample data
            const snapshot = await firestore.collection('businesses').limit(1).get();
            if (snapshot.empty) {
                await sampleDataService.populateSampleData();
            }
            
            // Fetch businesses - only show approved businesses
            const businessSnapshot = await firestore
                .collection('businesses')
                .where('approvalStatus', '==', 'approved')
                .get();
            
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
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBusinesses();
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        
        if (!query && selectedCategory === 'All') {
            setFilteredBusinesses(businesses);
            return;
        }
        
        const filtered = businesses.filter(business => {
            const matchesQuery = !query || 
                business.name.toLowerCase().includes(query.toLowerCase()) ||
                (business.description && business.description.toLowerCase().includes(query.toLowerCase()));
                
            const matchesCategory = selectedCategory === 'All' || business.category === selectedCategory;
            
            return matchesQuery && matchesCategory;
        });
        
        setFilteredBusinesses(filtered);
    };
    
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        
        if (category === 'All' && !searchQuery) {
            setFilteredBusinesses(businesses);
            return;
        }
        
        const filtered = businesses.filter(business => {
            const matchesQuery = !searchQuery || 
                business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (business.description && business.description.toLowerCase().includes(searchQuery.toLowerCase()));
                
            const matchesCategory = category === 'All' || business.category === category;
            
            return matchesQuery && matchesCategory;
        });
        
        setFilteredBusinesses(filtered);
    };
    
    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryItem,
                { backgroundColor: theme.card },
                selectedCategory === item && [styles.selectedCategoryItem, { backgroundColor: theme.primaryLight }]
            ]}
            onPress={() => handleCategorySelect(item)}
        >
            <Text 
                style={[
                    styles.categoryText, 
                    { color: theme.secondaryText },
                    selectedCategory === item && [styles.selectedCategoryText, { color: theme.primary }]
                ]}
            >
                {item}
            </Text>
        </TouchableOpacity>
    );
    
    const renderBusinessItem = ({ item }) => {
        const firstLetter = item.name ? item.name.charAt(0).toUpperCase() : '?';
        const randomColor = getRandomColor(item.id);
        
        return (
            <TouchableOpacity 
                style={[styles.businessCard, { backgroundColor: theme.card }]}
                onPress={() => navigation.navigate('QueuePage', { businessId: item.id })}
            >
                <View style={styles.businessHeader}>
                    <View style={[styles.businessIconContainer, { backgroundColor: randomColor }]}>
                        <Text style={styles.businessIconText}>{firstLetter}</Text>
                    </View>
                    <View style={styles.businessInfo}>
                        <Text style={[styles.businessName, { color: theme.text }]}>{item.name}</Text>
                        <View style={styles.businessMeta}>
                            {item.category && (
                                <View style={[styles.categoryBadge, { backgroundColor: theme.primaryLight }]}>
                                    <Text style={[styles.categoryBadgeText, { color: theme.primary }]}>{item.category}</Text>
                                </View>
                            )}
                            <Text style={[styles.businessStatus, { color: item.status === 'open' ? theme.success : theme.error }]}>
                                {item.status === 'open' ? 'Open' : 'Closed'}
                            </Text>
                        </View>
                    </View>
                </View>
                
                {item.description && (
                    <Text style={[styles.businessDescription, { color: theme.secondaryText }]} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
                
                <View style={styles.businessFooter}>
                    <View style={styles.businessStats}>
                        <View style={styles.statItem}>
                            <Icon name="clock-outline" size={16} color={theme.secondaryText} />
                            <Text style={[styles.statText, { color: theme.secondaryText }]}>
                                ~{item.estimatedTimePerCustomer || 15} min
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Icon name="account-outline" size={16} color={theme.secondaryText} />
                            <Text style={[styles.statText, { color: theme.secondaryText }]}>
                                {item.currentQueueSize || 0} in queue
                            </Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.queueButton, { backgroundColor: item.status === 'open' ? theme.primary : theme.border }]}
                        onPress={() => navigation.navigate('QueuePage', { businessId: item.id })}
                        disabled={item.status !== 'open'}
                    >
                        <Text style={styles.queueButtonText}>
                            {item.status === 'open' ? 'Join Queue' : 'Closed'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };
    
    // Generate a consistent color based on business ID
    const getRandomColor = (id) => {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#6B5CA5', '#61C0BF', '#FF9A76', '#A5DEE5'];
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.backButton, { backgroundColor: theme.card }]}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Businesses</Text>
                <View style={styles.placeholder} />
            </View>
            
            <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
                <Icon name="magnify" size={24} color={theme.secondaryText} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search businesses"
                    placeholderTextColor={theme.secondaryText}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>
            
            <View style={styles.categoriesContainer}>
                <FlatList
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                />
            </View>
            
            {loading && !refreshing ? (
                <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : filteredBusinesses.length === 0 ? (
                <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
                    <Icon name="store-search-outline" size={60} color={theme.secondaryText} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                        No businesses found
                    </Text>
                    <Text style={[styles.emptyDescription, { color: theme.secondaryText }]}>
                        Try a different search term or category
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredBusinesses}
                    renderItem={renderBusinessItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.businessList, { paddingBottom: insets.bottom + 16 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.primary]}
                            tintColor={theme.primary}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    placeholder: {
        width: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 25,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    categoriesContainer: {
        marginVertical: 8,
    },
    categoriesList: {
        paddingHorizontal: 16,
    },
    categoryItem: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    selectedCategoryItem: {
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    selectedCategoryText: {
    },
    businessList: {
        padding: 16,
        paddingTop: 8,
    },
    businessCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    businessHeader: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    businessIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    businessIconText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    businessInfo: {
        flex: 1,
    },
    businessName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    businessMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginRight: 8,
    },
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    businessStatus: {
        fontSize: 14,
        fontWeight: '500',
    },
    businessDescription: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    businessFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    businessStats: {
        flexDirection: 'row',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    statText: {
        fontSize: 14,
        marginLeft: 4,
    },
    queueButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    queueButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        textAlign: 'center',
    },
});