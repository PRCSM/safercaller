import {
  collection, addDoc, getDocs, getDoc, doc,
  updateDoc, setDoc, query, where,
  orderBy, limit, startAfter, serverTimestamp
} from '@react-native-firebase/firestore';
import { ref, getDownloadURL } from '@react-native-firebase/storage';
import { db, storage } from '../../firebaseConfig';

export const createListing = async (sellerId, data, mediaFiles = []) => {
  try {
    const listingRef = await addDoc(collection(db, 'listings'), {
      ...data,
      sellerId,
      mediaUrls: [],
      status: 'active',
      avgRating: 0,
      reviewCount: 0,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (mediaFiles.length > 0) {
      // FIX: putFile(uri) — native RN upload path. uploadBytes(blob) fails
      // on React Native with "uploadBytes() is not implemented".
      const uploadPromises = mediaFiles.map(async (file, i) => {
        const storageRef = ref(storage, 'listings/' + listingRef.id + '/media_' + i);
        await storageRef.putFile(file.uri);
        return await getDownloadURL(storageRef);
      });
      const mediaUrls = await Promise.all(uploadPromises);
      await updateDoc(doc(db, 'listings', listingRef.id), { mediaUrls });
    }
    return listingRef.id;
  } catch (err) {
    throw { code: 'listings/create-failed', message: err.message };
  }
};

export const getListings = async (filters = {}, pageSize = 20, lastDoc = null) => {
  try {
    let q;
    const baseConstraints = [where('status', '==', 'active')];
    const pagination = [limit(pageSize), ...(lastDoc ? [startAfter(lastDoc)] : [])];

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      // Price range: orderBy price only (Firestore single range rule)
      q = query(collection(db, 'listings'),
        ...baseConstraints,
        ...(filters.category ? [where('category', '==', filters.category)] : []),
        where('price', '>=', filters.minPrice ?? 0),
        where('price', '<=', filters.maxPrice ?? 9999999),
        orderBy('price', 'asc'),
        ...pagination
      );
    } else if (filters.category && filters.type) {
      q = query(collection(db, 'listings'),
        ...baseConstraints,
        where('category', '==', filters.category),
        where('type', '==', filters.type),
        orderBy('createdAt', 'desc'),
        ...pagination
      );
    } else if (filters.category) {
      q = query(collection(db, 'listings'),
        ...baseConstraints,
        where('category', '==', filters.category),
        orderBy('createdAt', 'desc'),
        ...pagination
      );
    } else if (filters.type) {
      q = query(collection(db, 'listings'),
        ...baseConstraints,
        where('type', '==', filters.type),
        orderBy('createdAt', 'desc'),
        ...pagination
      );
    } else {
      q = query(collection(db, 'listings'),
        ...baseConstraints,
        orderBy('createdAt', 'desc'),
        ...pagination
      );
    }

    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { results, lastDoc: snap.docs[snap.docs.length - 1] ?? null };
  } catch (err) {
    throw { code: 'listings/fetch-failed', message: err.message };
  }
};

export const getListingById = async (id) => {
  try {
    const snap = await getDoc(doc(db, 'listings', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    throw { code: 'listings/not-found', message: err.message };
  }
};

export const getMyListings = async (sellerId) => {
  try {
    const q = query(
      collection(db, 'listings'),
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    throw { code: 'listings/my-fetch-failed', message: err.message };
  }
};

export const updateListing = async (id, data) => {
  try {
    await updateDoc(doc(db, 'listings', id), { ...data, updatedAt: serverTimestamp() });
  } catch (err) {
    throw { code: 'listings/update-failed', message: err.message };
  }
};

export const deleteListing = async (id) => {
  try {
    await updateDoc(doc(db, 'listings', id), { status: 'deleted', updatedAt: serverTimestamp() });
  } catch (err) {
    throw { code: 'listings/delete-failed', message: err.message };
  }
};

export const relistListing = async (id) => {
  try {
    await updateDoc(doc(db, 'listings', id), {
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw { code: 'listings/relist-failed', message: err.message };
  }
};