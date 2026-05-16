// Dynamic Expo config — receives the resolved values from app.json via the
// `config` parameter, then overlays googleServicesFile paths from EAS file
// environment variables when present.
//
// On local dev (no env var set), the literal paths in app.json are used.
// On EAS Build, GOOGLE_SERVICES_JSON / GOOGLE_SERVICES_INFO_PLIST are file
// env vars uploaded via `eas env:create --type file`; EAS restores them to
// a temp path on the build worker and sets the env var to that path.
//
// .gitignore keeps the real google-services.json / GoogleService-Info.plist
// out of source control — EAS file env vars are the canonical secret-file
// distribution mechanism.

module.exports = ({ config }) => {
  const next = { ...config };

  if (process.env.GOOGLE_SERVICES_JSON) {
    next.android = {
      ...next.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    };
  }

  if (process.env.GOOGLE_SERVICES_INFO_PLIST) {
    next.ios = {
      ...next.ios,
      googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST,
    };
  }

  return next;
};
