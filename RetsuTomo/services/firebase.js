import { firebase } from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';

if (!firebase.apps.length) {
  firebase.initializeApp();
}

export const auth = firebase.auth();
export const firestore = firebase.firestore();