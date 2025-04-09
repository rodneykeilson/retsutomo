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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';

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
                selectedCategory === item && styles.selectedCategoryItem,
                { 
                    backgroundColor: selectedCategory === item 
                        ? theme.primary 
                        : theme.isDarkMode ? theme.card : '#f0eeff'
                }
            ]}
            onPress={() => handleCategorySelect(item)}
        >
            <Text 
                style={[
                    styles.categoryText,
                    selectedCategory === item && styles.selectedCategoryText,
                    { 
                        color: selectedCategory === item 
                            ? '#fff' 
                            : theme.primary
                    }
                ]}
            >
                {item}
            </Text>
        </TouchableOpacity>
    );
    
    const renderBusinessItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.businessCard, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('QueuePage', { businessId: item.id })}
        >
            <View style={styles.businessHeader}>
                <View style={[styles.businessIconContainer, { backgroundColor: theme.primaryLight }]}>
                    <Icon name="store" size={24} color={theme.primary} />
                </View>
                <View style={styles.businessInfo}>
                    <Text style={[styles.businessName, { color: theme.text }]}>{item.name}</Text>
                    <View style={styles.businessMeta}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{item.category || 'General'}</Text>
                        </View>
                        <Text style={[styles.businessStatus, { color: item.status === 'open' ? theme.success : theme.error }]}>
                            {item.status === 'open' ? 'Open' : 'Closed'}
                        </Text>
                    </View>
                </View>
            </View>
            
            {item.description && (
                <Text style={[styles.businessDescription, { color: theme.secondaryText }]}>
                    {item.description}
                </Text>
            )}
            
            <View style={styles.businessFooter}>
                <View style={styles.businessStats}>
                    <View style={styles.statItem}>
                        <Icon name="account-multiple" size={16} color={theme.secondaryText} />
                        <Text style={[styles.statText, { color: theme.secondaryText }]}>
                            {item.currentQueueLength || 0} in queue
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Icon name="clock-outline" size={16} color={theme.secondaryText} />
                        <Text style={[styles.statText, { color: theme.secondaryText }]}>
                            ~{item.estimatedWaitTime || 0} min wait
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity 
                    style={[styles.queueButton, { backgroundColor: theme.primary }]}
                    onPress={() => navigation.navigate('QueuePage', { businessId: item.id })}
                >
                    <Text style={styles.queueButtonText}>Join Queue</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
    
    if (loading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]} edges={['top', 'right', 'left', 'bottom']}>
                <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView 
            style={[styles.container, { backgroundColor: theme.background }]} 
            edges={['top', 'right', 'left', 'bottom']}
        >
            <StatusBar backgroundColor={theme.background} barStyle={theme.statusBar} />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.backButton, { backgroundColor: theme.card }]} 
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Find Businesses</Text>
                <View style={styles.placeholder} />
            </View>
            
            <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
                <Icon name="magnify" size={24} color={theme.secondaryText} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search businesses..."
                    placeholderTextColor={theme.secondaryText}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Icon name="close" size={20} color={theme.secondaryText} />
                    </TouchableOpacity>
                )}
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
            
            {filteredBusinesses.length === 0 ? (
                <View style={[styles.emptyContainer, { paddingBottom: insets.bottom }]}>
                    <Icon name="store-search" size={64} color={theme.secondaryText} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No businesses found</Text>
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
        backgroundColor: '#f0eeff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginRight: 8,
    },
    categoryBadgeText: {
        fontSize: 12,
        color: '#56409e',
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