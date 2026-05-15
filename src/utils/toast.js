/**
 * Imperative toast API.
 *
 * Import `toast` from anywhere (services, screens, stores) and call:
 *   toast.success('Report submitted')
 *   toast.error('No internet connection', 'Retrying in 5s')
 *   toast.warning('File too large')
 *   toast.info('New version available')
 *
 * Implementation: a single ToastContainer (mounted once in App.js)
 * registers itself with this module via `registerToastContainer` on
 * mount; the `toast.*` helpers dispatch to its `show` method.
 *
 * If no container is registered yet (called pre-mount), the call is a
 * no-op — the toast is silently dropped. This keeps callers from
 * crashing in startup paths.
 */

let containerHandle = null;

export const registerToastContainer = (handle) => {
  containerHandle = handle;
};

const dispatch = (type) => (title, subtitle) => {
  if (!containerHandle) return;
  containerHandle.show({ type, title, subtitle });
};

export const toast = {
  success: dispatch('success'),
  error:   dispatch('error'),
  warning: dispatch('warning'),
  info:    dispatch('info'),
};

export default toast;
