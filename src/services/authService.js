import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  signInWithPhoneNumber as fbSignInWithPhoneNumber,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from '@react-native-firebase/auth';
import { resetAllStores } from '../store';

/**
 * Phone OTP auth flow via @react-native-firebase/auth — fully modular
 * API (no more `auth().*` namespaced calls — those emit the v22 "Please
 * use getApp() instead" deprecation warnings).
 *
 * The confirmation object that signInWithPhoneNumber returns has a non-
 * serializable `.confirm()` method, so we cache it in module scope here
 * and let callers verify the OTP via `verifyOTP(code)` — only
 * serializable strings cross the React Navigation boundary.
 */

const getAuthInstance = () => getAuth(getApp());

let pendingConfirmation = null;

export const signUpWithPhone = async (phoneNumber) => {
  const confirmation = await fbSignInWithPhoneNumber(getAuthInstance(), phoneNumber);
  pendingConfirmation = confirmation;
  // Return the serializable verificationId so OTPScreen can display
  // "OTP sent to X" UI without touching the confirmation object.
  return confirmation.verificationId;
};

export const verifyOTP = async (code) => {
  if (!pendingConfirmation) {
    throw new Error('OTP session expired. Tap Resend to get a new code.');
  }
  const result = await pendingConfirmation.confirm(code);
  pendingConfirmation = null;
  return result.user;
};

export const signOut = async () => {
  await fbSignOut(getAuthInstance());
  resetAllStores();
};

export const onAuthStateChanged = (callback) =>
  fbOnAuthStateChanged(getAuthInstance(), callback);

export const getCurrentUser = () => getAuthInstance().currentUser;
