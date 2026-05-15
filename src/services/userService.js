import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';

/**
 * Real Firestore + Storage user-profile service.
 *
 * Only reached when src/constants/config.js → IS_MOCK is false.
 * In mock mode, src/services/index.js routes to mockUserService instead.
 *
 * Schema lives at `users/{uid}` — see SAFERCALLER_PRD.html §11.
 */

const usersCol = () => collection(db, 'users');
const userRef = (uid) => doc(db, 'users', uid);

export const createUserProfile = async (uid, data) => {
  try {
    const payload = {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef(uid), payload);
    return payload;
  } catch (err) {
    console.warn('[userService.createUserProfile]', err);
    throw err;
  }
};

export const getUserProfile = async (uid) => {
  try {
    const snap = await getDoc(userRef(uid));
    return snap.exists() ? { uid, ...snap.data() } : null;
  } catch (err) {
    console.warn('[userService.getUserProfile]', err);
    throw err;
  }
};

export const updateUserProfile = async (uid, data) => {
  try {
    await updateDoc(userRef(uid), data);
    return data;
  } catch (err) {
    console.warn('[userService.updateUserProfile]', err);
    throw err;
  }
};

export const uploadProfilePhoto = async (uid, uri) => {
  try {
    // expo-image-picker URIs are file:// paths; fetch + blob is the cross-
    // platform way to get an uploadable body. For large files, switch to
    // uploadBytesResumable so we can surface progress to the UI.
    const response = await fetch(uri);
    const blob = await response.blob();
    const photoRef = ref(storage, `profilePhotos/${uid}.jpg`);
    await uploadBytes(photoRef, blob);
    const url = await getDownloadURL(photoRef);
    // Persist the URL on the profile doc so reads don't need a separate
    // Storage lookup.
    await updateDoc(userRef(uid), { profilePhoto: url });
    return url;
  } catch (err) {
    console.warn('[userService.uploadProfilePhoto]', err);
    throw err;
  }
};

export const updateOnlineStatus = async (uid, goOnline) => {
  try {
    await updateDoc(userRef(uid), { goOnline: !!goOnline });
    return !!goOnline;
  } catch (err) {
    console.warn('[userService.updateOnlineStatus]', err);
    throw err;
  }
};

export const checkDuplicatePhone = async (phone) => {
  try {
    const q = query(usersCol(), where('phone', '==', phone), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.warn('[userService.checkDuplicatePhone]', err);
    throw err;
  }
};

export const checkDuplicateEmail = async (email) => {
  try {
    const q = query(usersCol(), where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.warn('[userService.checkDuplicateEmail]', err);
    throw err;
  }
};
