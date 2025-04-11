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
import { useTheme } from '../theme/ThemeContext';

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
  const { theme } = useTheme();
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

  // Get approval status badge color
  const getApprovalStatusColor = (status) => {
    switch(status) {
      case 'approved':
        return theme.success;
      case 'rejected':
        return theme.error;
      default:
        return theme.warning;
    }
  };

  // Get approval status text
  const getApprovalStatusText = (status) => {
    switch(status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending Approval';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Approval Status Banner */}
      {business?.approvalStatus && (
        <View style={[styles.approvalBanner, { backgroundColor: getApprovalStatusColor(business.approvalStatus) + '20' }]}>
          <Icon 
            name={business.approvalStatus === 'approved' ? 'check-circle' : 
                 business.approvalStatus === 'rejected' ? 'close-circle' : 'clock-outline'} 
            size={20} 
            color={getApprovalStatusColor(business.approvalStatus)} 
          />
          <Text style={[styles.approvalText, { color: getApprovalStatusColor(business.approvalStatus) }]}>
            {getApprovalStatusText(business.approvalStatus)}
            {business.approvalStatus === 'pending' && ' - Your business is awaiting admin review'}
            {business.approvalStatus === 'rejected' && ' - Please update your information and contact support'}
          </Text>
        </View>
      )}

      <View style={[styles.formSection, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Basic Information</Text>
        
        <Text style={[styles.label, { color: theme.text }]}>Business Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={name}
          onChangeText={setName}
          placeholder="Enter business name"
          placeholderTextColor={theme.secondaryText}
        />
        
        <Text style={[styles.label, { color: theme.text }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your business"
          placeholderTextColor={theme.secondaryText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <Text style={[styles.label, { color: theme.text }]}>Category</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        >
          <Text style={[styles.dropdownButtonText, { color: theme.text }]}>{category}</Text>
          <Icon 
            name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={theme.secondaryText} 
          />
        </TouchableOpacity>
        
        {showCategoryDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.dropdownItem,
                  category === item && [styles.dropdownItemSelected, { backgroundColor: theme.primaryLight }]
                ]}
                onPress={() => {
                  setCategory(item);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text 
                  style={[
                    styles.dropdownItemText,
                    { color: theme.text },
                    category === item && [styles.dropdownItemTextSelected, { color: theme.primary }]
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text style={[styles.label, { color: theme.text }]}>Address</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter business address"
          placeholderTextColor={theme.secondaryText}
        />
      </View>
      
      <View style={[styles.formSection, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Queue Settings</Text>
        
        <Text style={[styles.label, { color: theme.text }]}>Estimated Time Per Customer (minutes)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={estimatedTimePerCustomer}
          onChangeText={setEstimatedTimePerCustomer}
          placeholder="15"
          placeholderTextColor={theme.secondaryText}
          keyboardType="numeric"
        />
        
        <Text style={[styles.label, { color: theme.text }]}>Maximum Queue Size</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={maxQueueSize}
          onChangeText={setMaxQueueSize}
          placeholder="20"
          placeholderTextColor={theme.secondaryText}
          keyboardType="numeric"
        />
      </View>
      
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        onPress={handleSave}
        disabled={loading || business?.approvalStatus === 'rejected'}
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

      {business?.approvalStatus === 'rejected' && (
        <Text style={[styles.rejectedNote, { color: theme.error }]}>
          You cannot edit a rejected business. Please contact support for assistance.
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  approvalText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
  },
  dropdownList: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
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
  },
  dropdownItemTextSelected: {
    fontWeight: '500',
  },
  saveButton: {
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
  rejectedNote: {
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
});

export default BusinessDetailsForm;
