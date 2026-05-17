import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp
} from '@react-native-firebase/firestore';
import { ref, getDownloadURL } from '@react-native-firebase/storage';
import { db, storage } from '../../firebaseConfig';

export const getChatId = (uid1, uid2) => [uid1, uid2].sort().join('_');

export const sendMessage = async (chatId, senderId, receiverId, text, mediaUri = null) => {
  try {
    let mediaUrl = null;
    let mediaType = null;
    if (mediaUri) {
      // FIX: putFile(uri) takes the local file URI directly — avoids the
      // Blob conversion that fails with "uploadBytes() is not implemented"
      // on RN. mediaType is now inferred from the file extension server-side.
      const storageRef = ref(storage, 'chatMedia/' + chatId + '/' + Date.now());
      await storageRef.putFile(mediaUri);
      mediaUrl = await getDownloadURL(storageRef);
      // Best-effort mime hint from extension for downstream rendering.
      const ext = (mediaUri.split('.').pop() || '').toLowerCase();
      mediaType = ext === 'mp4' || ext === 'mov' ? 'video' : 'image';
    }
    const msgData = {
      senderId,
      receiverId,
      text: text || null,
      mediaUrl,
      mediaType,
      read: false,
      deleted: false,
      createdAt: serverTimestamp(),
    };
    const msgRef = await addDoc(
      collection(db, 'chats', chatId, 'messages'),
      msgData
    );
    // Update chat metadata — used by getConversations to show preview
    await updateDoc(doc(db, 'chats', chatId), {
      participants: [senderId, receiverId],
      lastMessage: text || '📎 Media',
      lastSenderId: senderId,
      lastAt: serverTimestamp(),
    }).catch(async () => {
      // Doc may not exist yet — create it
      const { setDoc } = await import('@react-native-firebase/firestore');
      await setDoc(doc(db, 'chats', chatId), {
        participants: [senderId, receiverId],
        lastMessage: text || '📎 Media',
        lastSenderId: senderId,
        lastAt: serverTimestamp(),
      });
    });
    return msgRef.id;
  } catch (err) {
    throw { code: 'chat/send-failed', message: err.message };
  }
};

export const getMessages = (chatId, callback, pageSize = 50) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(pageSize)
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(m => !m.deleted);
    callback(messages);
  }, (err) => {
    console.error('getMessages error:', err);
  });
};

export const getConversations = (uid, callback) => {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('lastAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error('getConversations error:', err);
  });
};

export const markAsRead = async (chatId, uid) => {
  try {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      where('receiverId', '==', uid),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
  } catch (err) {
    throw { code: 'chat/mark-read-failed', message: err.message };
  }
};

export const deleteMessage = async (chatId, msgId) => {
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), {
      deleted: true,
      text: null,
      mediaUrl: null,
    });
  } catch (err) {
    throw { code: 'chat/delete-failed', message: err.message };
  }
};

export const blockUser = async (uid, targetUid) => {
  try {
    const { arrayUnion } = await import('@react-native-firebase/firestore');
    await updateDoc(doc(db, 'users', uid), {
      blockedUsers: arrayUnion(targetUid),
    });
  } catch (err) {
    throw { code: 'chat/block-failed', message: err.message };
  }
};