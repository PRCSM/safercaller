import {
  collection, getDocs, query, where,
  orderBy, limit, startAfter
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const PUBLIC_FIELDS = [
  'uid','name','profession','subProfession','location','reputationScore',
  'verified','goOnline','profilePhoto','gender','maritalStatus','religion',
  'createdAt',
];

const stripPrivateFields = (uid, data) => {
  const pub = { uid };
  PUBLIC_FIELDS.forEach(f => { if (data[f] !== undefined) pub[f] = data[f]; });
  // verified object: keep liveness/thumbprint/idProof booleans, strip any raw URLs
  if (pub.verified) {
    pub.verified = {
      liveness:   !!pub.verified.liveness,
      thumbprint: !!pub.verified.thumbprint,
      idProof:    !!pub.verified.idProof,
    };
  }
  return pub;
};

export const searchPeople = async (filters = {}, pageSize = 20, lastDoc = null) => {
  try {
    let q;
    // Single server-side range filter
    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      q = query(
        collection(db, 'users'),
        where('goOnline', '==', true),
        where('reputationScore', '>=', filters.minScore ?? 0),
        where('reputationScore', '<=', filters.maxScore ?? 1000),
        orderBy('reputationScore', 'desc'),
        limit(pageSize),
        ...(lastDoc ? [startAfter(lastDoc)] : [])
      );
    } else {
      q = query(
        collection(db, 'users'),
        where('goOnline', '==', true),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
        ...(lastDoc ? [startAfter(lastDoc)] : [])
      );
    }

    const snap = await getDocs(q);
    let results = snap.docs.map(d => stripPrivateFields(d.id, d.data()));

    // Client-side filters (all non-range)
    if (filters.gender)        results = results.filter(u => u.gender === filters.gender);
    if (filters.profession)    results = results.filter(u => u.profession === filters.profession);
    if (filters.location)      results = results.filter(u => u.location === filters.location);
    if (filters.maritalStatus) results = results.filter(u => u.maritalStatus === filters.maritalStatus);
    if (filters.religion)      results = results.filter(u => u.religion === filters.religion);
    if (filters.verifiedOnly)  results = results.filter(u =>
      u.verified?.liveness && u.verified?.thumbprint && u.verified?.idProof
    );
    if (filters.name)          results = results.filter(u =>
      u.name?.toLowerCase().includes(filters.name.toLowerCase())
    );

    const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { results, lastDoc: newLastDoc };
  } catch (err) {
    throw { code: 'people/search-failed', message: err.message };
  }
};