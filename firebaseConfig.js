// Native Firebase entry point.
//
// All Firebase access on the mobile app goes through @react-native-firebase
// modules (auth, firestore, storage, functions). These all share the same
// auth state, so request.auth in Firestore + Storage rules sees the user
// signed in via @react-native-firebase/auth's phone OTP flow.
//
// The native modules auto-initialize from google-services.json /
// GoogleService-Info.plist at app startup — we don't need initializeApp().
// We just grab the default app instance via getApp() and create scoped
// service instances for the rest of the app to import.
//
// Why not the Firebase JS SDK (firebase/firestore, etc.)? It maintains
// auth state separate from @react-native-firebase/auth, which makes every
// rule-checked read / write fail with permission-denied. That mismatch
// caused us to migrate the data layer to RNFirebase modular in Phase 12.

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getFunctions } from '@react-native-firebase/functions';
import { IS_MOCK } from './src/constants/config';

let app, auth, db, storage, functions;

if (!IS_MOCK) {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'us-central1');
  console.log('🔥 Firebase connected (native) — project:', app.options.projectId);
} else {
  console.log('🔧 MOCK MODE — Firebase not initialized');
}

export { auth, db, storage, functions };
export default app;
