import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// IS_MOCK defaults to false when the API key is present; flip it true by
// setting VITE_USE_MOCK=true in .env.local to force the dashboard back to
// mock data.
const hasFirebaseConfig = !!import.meta.env.VITE_FIREBASE_API_KEY;
export const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !hasFirebaseConfig;

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _functions: Functions | null = null;

if (IS_MOCK) {
  // eslint-disable-next-line no-console
  console.log('🔧 MOCK MODE — Firebase not initialized');
} else {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  app = initializeApp(config);
  _auth = getAuth(app);
  _db = getFirestore(app);
  _storage = getStorage(app);
  _functions = getFunctions(app, 'us-central1');
  // eslint-disable-next-line no-console
  console.log('🔥 Firebase connected — project:', config.projectId);
}

export const auth = _auth;
export const db = _db;
export const storage = _storage;
export const functions = _functions;
export default app;