import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '../../firebaseConfig';

/**
 * Client wrappers for the SAFERCALLER Cloud Functions deployed in Phase 8.
 *
 * Only reached when src/constants/config.js → IS_MOCK is false.
 * In mock mode, src/services/index.js routes to mockFunctionsService.
 *
 * Errors are swallowed and surfaced as `null` / fallback list so screens
 * can render a sensible UI even when the function or network is down.
 */

const DEFAULT_PROFESSIONS = [
  'Software Engineer', 'Teacher', 'Doctor', 'Accountant', 'Designer',
  'Sales Manager', 'Plumber', 'Electrician', 'Driver', 'Photographer',
  'Nurse', 'Pharmacist', 'Lawyer', 'Architect', 'Chef', 'Journalist',
  'Banker', 'Real Estate Agent', 'Shopkeeper', 'Student', 'Other',
];

export const getAIProfessions = async ({ refresh = false } = {}) => {
  try {
    const callable = httpsCallable(functions, 'getAIProfessions');
    const result = await callable({ refresh });
    const list = result?.data?.list;
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_PROFESSIONS;
  } catch (err) {
    console.warn('[functionsService.getAIProfessions]', err?.message ?? err);
    return DEFAULT_PROFESSIONS;
  }
};

export const computeReputationScore = async (uid) => {
  try {
    const callable = httpsCallable(functions, 'computeReputationScore');
    const result = await callable(uid ? { uid } : {});
    return typeof result?.data?.score === 'number' ? result.data.score : null;
  } catch (err) {
    console.warn('[functionsService.computeReputationScore]', err?.message ?? err);
    return null;
  }
};
