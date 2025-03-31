import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
} from 'react-native';

import { createDrawerNavigator } from '@react-navigation/drawer';

import ProfilePage from './ProfilePage';

const Drawer = createDrawerNavigator();

function DashboardHome() {
    const data = [
        { id: '1', title: 'Manage Queues' },
        { id: '2', title: 'View Users' },
        { id: '3', title: 'Manage Businesses' },
    ];

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card}>
            <Text style={styles.cardText}>{item.title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome to RetsuTomo</Text>
                <Text style={styles.subtitle}>Your Queue Management Dashboard</Text>
            </View>
            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

function SettingsPage() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.subtitle}>Customize your preferences</Text>
            </View>
        </SafeAreaView>
    );
}

export default function DashboardPage() {
    return (
        <Drawer.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#56409e' },
                headerTintColor: '#fff',
                drawerStyle: { backgroundColor: '#f5f5f5' },
                drawerActiveTintColor: '#56409e',
                drawerInactiveTintColor: '#281b52',
            }}
        >
            <Drawer.Screen name="Dashboard" component={DashboardHome} />
            <Drawer.Screen name="Profile" component={ProfilePage} />
            <Drawer.Screen name="Settings" component={SettingsPage} />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#281b52',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#9992a7',
        textAlign: 'center',
        marginTop: 8,
    },
    list: {
        marginTop: 16,
    },
    card: {
        backgroundColor: '#d8dffe',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    cardText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#281b52',
    },
});