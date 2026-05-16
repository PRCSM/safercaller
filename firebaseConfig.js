import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_MOCK } from './src/constants/config';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate all required vars are present
const requiredKeys = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'];
const missing = requiredKeys.filter(k => !firebaseConfig[k]);
if (!IS_MOCK && missing.length > 0) {
  console.error('❌ Missing Firebase env vars:', missing);
}

let app, auth, db, storage, functions;

if (!IS_MOCK) {
  app = initializeApp(firebaseConfig);

  // initializeAuth with AsyncStorage persistence — must run before any
  // getAuth(app) call in the app. If something else already initialized
  // auth (e.g. Fast Refresh re-running this module), fall back to the
  // existing instance.
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (_) {
    auth = getAuth(app);
  }

  db        = getFirestore(app);
  storage   = getStorage(app);
  functions = getFunctions(app, 'us-central1');
  console.log('🔥 Firebase connected — project:', firebaseConfig.projectId);
} else {
  console.log('🔧 MOCK MODE — Firebase not initialized');
}

export { auth, db, storage, functions };
export default app;
