import { ref, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { storage } from '../../firebaseConfig';

/**
 * Thin wrapper over @react-native-firebase/storage.
 *
 * Uses `Reference.putFile(localUri)` rather than the modular `uploadBytes`.
 * `uploadBytes` requires a Blob, and Blob creation from a `file://` URI
 * via `fetch(uri).then(r => r.blob())` is unreliable on React Native —
 * the JS SDK path throws "`uploadBytes()` is not implemented" in the
 * RNFirebase modular surface. `putFile` is the native upload path; it
 * takes the local URI directly and handles streaming + retries natively.
 */
export const uploadFile = async (path, uri /* mimeType ignored — inferred */) => {
  try {
    const fileRef = ref(storage, path);
    await fileRef.putFile(uri);
    return await getDownloadURL(fileRef);
  } catch (err) {
    console.warn('[storageService.uploadFile]', err);
    throw err;
  }
};

export const deleteFile = async (path) => {
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    console.warn('[storageService.deleteFile]', err);
    throw err;
  }
};

export const getFileUrl = async (path) => {
  try {
    return await getDownloadURL(ref(storage, path));
  } catch (err) {
    console.warn('[storageService.getFileUrl]', err);
    throw err;
  }
};
