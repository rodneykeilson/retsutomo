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
} from 'react-native';
import { firestore } from '../services/firebase';
import { useNavigation } from '@react-navigation/native';

export default function BusinessListPage() {
    const [businesses, setBusinesses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredBusinesses, setFilteredBusinesses] = useState([]);
    const navigation = useNavigation();

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                const snapshot = await firestore.collection('businesses').get();
                const businessData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setBusinesses(businessData);
                setFilteredBusinesses(businessData);
            } catch (error) {
                Alert.alert('Error', error.message);
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
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Business List</Text>
                <Text style={styles.subtitle}>Search and select a business to queue</Text>
            </View>
            <TextInput
                style={styles.input}
                placeholder="Search for a business"
                placeholderTextColor="#9992a7"
                value={searchQuery}
                onChangeText={handleSearch}
            />
            <FlatList
                data={filteredBusinesses}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    header: {
        marginBottom: 16,
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
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#281b52',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#d8dffe',
    },
    list: {
        marginTop: 16,
    },
    card: {
        backgroundColor: '#d8dffe',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
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
});