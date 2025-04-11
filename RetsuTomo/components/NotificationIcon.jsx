import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../theme/ThemeContext';

const NotificationIcon = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation();
  const { theme } = useTheme();

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) return;

    // Subscribe to unread notifications count
    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('notifications')
      .where('read', '==', false)
      .onSnapshot(
        snapshot => {
          setUnreadCount(snapshot.docs.length);
        },
        error => {
          console.error('Error listening to notifications:', error);
        }
      );

    return () => unsubscribe();
  }, []);

  const handlePress = () => {
    navigation.navigate('NotificationsScreen');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Icon name="notifications" size={24} color={theme.iconColor} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 8,
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationIcon;
