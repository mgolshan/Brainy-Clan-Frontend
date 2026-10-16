// Metro with Sentry's serializer: adds Debug IDs to bundles and source maps so errors can be
// symbolicated after `eas build` / `eas update` upload them (README "Error monitoring — Sentry
// setup"). Otherwise identical to Expo's default config.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
