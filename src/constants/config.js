/**
 * Global mock-mode flag.
 *
 * When `IS_MOCK` is true:
 *   - firebaseConfig.js does NOT call initializeApp; `auth`/`db`/`storage`
 *     are exported as null.
 *   - src/services/index.js routes every service call to the mock
 *     implementations in src/services/mock/mockServices.js (600 ms fake
 *     delay, deterministic data from mockData.js).
 *   - RootNavigator skips onAuthStateChanged and hydrates authStore with
 *     mockUser/mockProfile so the app boots straight into AppStack.
 *   - The yellow "🔧 MOCK" badge is rendered over the top-right corner.
 *
 * Flip to false (and fill EXPO_PUBLIC_FIREBASE_* in .env) to switch to
 * real Firebase. No other files should need to change.
 */
export const IS_MOCK = false;
