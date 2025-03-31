import { firebase } from '@react-native-firebase/app';
import '@react-native-firebase/auth';

if (!firebase.apps.length) {
  firebase.initializeApp();
}

export const auth = firebase.auth();