import auth from '@react-native-firebase/auth';
import { resetAllStores } from '../store';

export const signUpWithPhone = async (phoneNumber) => {
  const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
  return confirmation;
};

export const verifyOTP = async (confirmation, code) => {
  const result = await confirmation.confirm(code);
  return result.user;
};

export const signOut = async () => {
  await auth().signOut();
  resetAllStores();
};

export const onAuthStateChanged = (callback) => {
  return auth().onAuthStateChanged(callback);
};
