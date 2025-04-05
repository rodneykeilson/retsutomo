import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CATEGORIES = [
  'Food & Beverage',
  'Healthcare',
  'Services',
  'Retail',
  'Health & Beauty',
  'Entertainment',
  'Education',
  'Other'
];

const BusinessDetailsForm = ({ business, businessId, onUpdate }) => {
  const [name, setName] = useState(business?.name || '');
  const [description, setDescription] = useState(business?.description || '');
  const [category, setCategory] = useState(business?.category || 'Other');
  const [address, setAddress] = useState(business?.address || '');
  const [estimatedTimePerCustomer, setEstimatedTimePerCustomer] = useState(
    business?.estimatedTimePerCustomer?.toString() || '15'
  );
  const [maxQueueSize, setMaxQueueSize] = useState(
    business?.maxQueueSize?.toString() || '20'
  );
  const [loading, setLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    try {
      setLoading(true);
      
      const businessData = {
        name: name.trim(),
        description: description.trim(),
        category,
        address: address.trim(),
        estimatedTimePerCustomer: parseInt(estimatedTimePerCustomer) || 15,
        maxQueueSize: parseInt(maxQueueSize) || 20,
        updatedAt: new Date(),
      };
      
      if (businessId) {
        // Update existing business
        await firestore.collection('businesses').doc(businessId).update(businessData);
        Alert.alert('Success', 'Business details updated successfully');
      } else {
        // This should not happen in this component as it's for editing only
        Alert.alert('Error', 'Business ID not found');
      }
      
      if (onUpdate) {
        onUpdate({
          id: businessId,
          ...businessData
        });
      }
    } catch (error) {
      console.error('Error updating business:', error);
      Alert.alert('Error', 'Failed to update business details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter business name"
          placeholderTextColor="#9992a7"
        />
        
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your business"
          placeholderTextColor="#9992a7"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        >
          <Text style={styles.dropdownButtonText}>{category}</Text>
          <Icon 
            name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#9992a7" 
          />
        </TouchableOpacity>
        
        {showCategoryDropdown && (
          <View style={styles.dropdownList}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.dropdownItem,
                  category === item && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  setCategory(item);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text 
                  style={[
                    styles.dropdownItemText,
                    category === item && styles.dropdownItemTextSelected
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter business address"
          placeholderTextColor="#9992a7"
        />
      </View>
      
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Queue Settings</Text>
        
        <Text style={styles.label}>Estimated Time Per Customer (minutes)</Text>
        <TextInput
          style={styles.input}
          value={estimatedTimePerCustomer}
          onChangeText={setEstimatedTimePerCustomer}
          placeholder="15"
          placeholderTextColor="#9992a7"
          keyboardType="numeric"
        />
        
        <Text style={styles.label}>Maximum Queue Size</Text>
        <TextInput
          style={styles.input}
          value={maxQueueSize}
          onChangeText={setMaxQueueSize}
          placeholder="20"
          placeholderTextColor="#9992a7"
          keyboardType="numeric"
        />
      </View>
      
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name="content-save" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#281b52',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#281b52',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#281b52',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#281b52',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0eeff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#281b52',
  },
  dropdownItemTextSelected: {
    color: '#56409e',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#56409e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BusinessDetailsForm;
