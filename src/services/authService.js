import auth from '@react-native-firebase/auth';
import { resetAllStores } from '../store';

/**
 * Phone OTP auth flow via @react-native-firebase/auth.
 *
 * RNFirebase's signInWithPhoneNumber returns a confirmation object that
 * has a non-serializable .confirm() method. Passing that object through
 * React Navigation params triggers the "Non-serializable values were
 * found in the navigation state" warning AND breaks state persistence.
 *
 * So we cache the confirmation in module scope here and let callers
 * verify the OTP via `verifyOTP(code)` — only serializable strings cross
 * the navigation boundary.
 */
let pendingConfirmation = null;

export const signUpWithPhone = async (phoneNumber) => {
  const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
  pendingConfirmation = confirmation;
  // Return the serializable verificationId so the OTPScreen can display
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
  await auth().signOut();
  resetAllStores();
};

export const onAuthStateChanged = (callback) => {
  return auth().onAuthStateChanged(callback);
};

export const getCurrentUser = () => auth().currentUser;
