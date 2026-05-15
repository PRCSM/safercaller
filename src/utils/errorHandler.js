import { toast } from './toast';

/**
 * Map Firebase + custom app error codes to user-friendly messages.
 *
 * Used by every service and screen catch block via `handleError(err, context)`.
 * Add new codes here rather than inline-formatting messages — keeps copy
 * consistent and translatable in one place.
 */
const ERROR_MAP = {
  // ─── Firebase Auth ─────────────────────────────────────────────────
  'auth/invalid-phone-number':       'Enter a valid 10-digit phone number.',
  'auth/missing-phone-number':       'Enter a phone number to continue.',
  'auth/too-many-requests':          'Too many attempts. Try again in a few minutes.',
  'auth/code-expired':               'OTP expired. Tap Resend to get a new one.',
  'auth/invalid-verification-code':  'Wrong OTP. Check and try again.',
  'auth/invalid-verification-id':    'Invalid verification session. Restart sign-in.',
  'auth/user-disabled':              'This account has been suspended.',
  'auth/user-not-found':             'No account found for this number.',
  'auth/network-request-failed':     'No internet connection. Check your network.',
  'auth/session-expired':            'Session expired. Please sign in again.',
  'auth/invalid-credential':         'Invalid credentials. Please try again.',
  'auth/operation-not-allowed':      'This sign-in method is not enabled.',

  // ─── Firestore ─────────────────────────────────────────────────────
  'permission-denied':               'You do not have permission to do this.',
  'not-found':                       'The requested data was not found.',
  'already-exists':                  'This record already exists.',
  'resource-exhausted':              'Too many requests. Please slow down.',
  'unavailable':                     'Service temporarily unavailable. Try again.',
  'deadline-exceeded':               'Request timed out. Check your connection.',
  'failed-precondition':             "Can't complete this action right now.",
  'aborted':                         'Action was interrupted. Try again.',
  'cancelled':                       'Action was cancelled.',

  // ─── Storage ───────────────────────────────────────────────────────
  'storage/unauthorized':            'You do not have permission to upload this file.',
  'storage/quota-exceeded':          'Storage limit reached. Contact support.',
  'storage/invalid-format':          'Invalid file format.',
  'storage/object-not-found':        'File not found.',
  'storage/canceled':                'Upload cancelled.',
  'storage/retry-limit-exceeded':    'Upload failed after too many retries.',

  // ─── Network ───────────────────────────────────────────────────────
  'network-request-failed':          'No internet connection. Check your network.',

  // ─── App-specific (services throw these) ───────────────────────────
  'chat/send-failed':                'Message failed to send. Try again.',
  'chat/mark-read-failed':           'Could not mark messages as read.',
  'chat/delete-failed':              'Could not delete message. Try again.',
  'chat/block-failed':               'Could not block user. Try again.',
  'listings/create-failed':          'Could not post listing. Try again.',
  'listings/fetch-failed':           'Could not load listings. Pull to refresh.',
  'listings/my-fetch-failed':        'Could not load your listings.',
  'listings/update-failed':          'Could not update listing. Try again.',
  'listings/delete-failed':          'Could not delete listing. Try again.',
  'listings/relist-failed':          'Could not re-list. Try again.',
  'listings/not-found':              'Listing not found or expired.',
  'people/search-failed':            'Search failed. Try again.',
  'scam/submit-failed':              'Could not submit report. Try again.',
};

const GENERIC = 'Something went wrong. Please try again.';

export const getErrorMessage = (error) => {
  if (!error) return GENERIC;
  const code = error.code || '';
  if (code && ERROR_MAP[code]) return ERROR_MAP[code];

  // Some Firestore SDK errors come through as 'firestore/permission-denied'.
  const stripped = code.replace(/^firestore\//, '');
  if (ERROR_MAP[stripped]) return ERROR_MAP[stripped];

  // Fall back to the error's own message if it's short and readable.
  const message = error.message || '';
  if (message && message.length < 120 && !/Firebase|Firestore/i.test(message)) {
    return message;
  }
  return GENERIC;
};

/**
 * Single entry point for handling a caught error.
 *
 * @param error    The caught error (Error, { code, message }, or string)
 * @param context  A short string for the console log (e.g. 'ChatScreen.send')
 * @returns        The user-friendly message that was toasted
 */
export const handleError = (error, context = '') => {
  const message = getErrorMessage(error);
  const tag = context ? `[${context}]` : '[error]';
  // Keep console.error — it's useful in production for crash-log correlation.
  console.error(tag, error?.code || error?.message || error);
  toast.error(message);
  return message;
};

export default { getErrorMessage, handleError };
