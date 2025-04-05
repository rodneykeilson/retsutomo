import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Image,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function DashboardPage() {
    const navigation = useNavigation();
    
    const featuredItems = [
        { id: '1', title: 'Manage Queues', icon: 'format-list-numbered', pagename: 'ManageQueuesPage', color: '#6C63FF' },
        { id: '3', title: 'Manage Businesses', icon: 'store-settings', pagename: 'ManageBusinessesPage', color: '#FF6584' },
    ];
    
    const quickActions = [
        { id: '4', title: 'Business List', icon: 'store-search', pagename: 'BusinessListPage', color: '#43A047' },
        { id: '5', title: 'My Queues', icon: 'ticket-account', pagename: 'MyQueuesPage', color: '#FB8C00' },
    ];

    const renderFeaturedItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.featuredCard, { backgroundColor: item.color }]} 
            onPress={() => navigation.navigate(item.pagename)}
        >
            <View style={styles.featuredIconContainer}>
                <Icon name={item.icon} size={32} color="#fff" />
            </View>
            <Text style={styles.featuredCardText}>{item.title}</Text>
        </TouchableOpacity>
    );

    const renderQuickAction = ({ item }) => (
        <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate(item.pagename)}
        >
            <View style={[styles.actionIconContainer, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={24} color="#fff" />
            </View>
            <Text style={styles.actionCardText}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome back!</Text>
                        <Text style={styles.title}>RetsuTomo</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.notificationButton}
                        onPress={() => {}}
                    >
                        <Icon name="bell-outline" size={24} color="#281b52" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryTitle}>Queue Management</Text>
                            <Text style={styles.summarySubtitle}>Manage your queues efficiently</Text>
                        </View>
                        <View style={styles.summaryIconContainer}>
                            <Icon name="ticket-confirmation" size={40} color="#56409e" />
                        </View>
                    </View>
                </View>
                
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Featured</Text>
                </View>
                
                <FlatList
                    data={featuredItems}
                    renderItem={renderFeaturedItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredList}
                />
                
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                
                <View style={styles.actionsGrid}>
                    {quickActions.map(item => renderQuickAction({ item }))}
                </View>
                
                <View style={styles.statsContainer}>
                    <Text style={styles.statsTitle}>Queue Statistics</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>0</Text>
                            <Text style={styles.statLabel}>Active Queues</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>0</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                    </View>
                </View>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
    },
    greeting: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9992a7',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#281b52',
        marginTop: 4,
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    summaryContainer: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    summaryCard: {
        backgroundColor: '#d8dffe',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    summaryContent: {
        flex: 1,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#281b52',
    },
    summarySubtitle: {
        fontSize: 14,
        fontWeight: '400',
        color: '#56409e',
        marginTop: 4,
    },
    summaryIconContainer: {
        marginLeft: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 30,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#281b52',
    },
    featuredList: {
        paddingHorizontal: 16,
    },
    featuredCard: {
        width: 160,
        height: 120,
        borderRadius: 16,
        marginHorizontal: 8,
        padding: 16,
        justifyContent: 'space-between',
        elevation: 3,
    },
    featuredIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featuredCardText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '46%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 8,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },
    actionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#281b52',
        flex: 1,
    },
    statsContainer: {
        marginTop: 10,
        marginBottom: 30,
        paddingHorizontal: 24,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#281b52',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        width: '48%',
        alignItems: 'center',
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#56409e',
    },
    statLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#9992a7',
        marginTop: 4,
    },
});