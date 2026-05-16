import { ref, uploadBytes, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { storage } from '../../firebaseConfig';

/**
 * Thin wrapper over firebase/storage.
 *
 * Caller passes a `uri` (e.g. from expo-image-picker / expo-document-picker
 * — a `file://...` path on device). We fetch+blob it because the JS SDK's
 * uploadBytes wants a Blob, not a uri string.
 *
 * For large files, swap `uploadBytes` for `uploadBytesResumable` so you can
 * surface progress to the UI.
 */
export const uploadFile = async (path, uri, mimeType) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileRef = ref(storage, path);
    const metadata = mimeType ? { contentType: mimeType } : undefined;
    await uploadBytes(fileRef, blob, metadata);
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
