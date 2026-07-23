// Sentry's wrapper around Expo's default Metro config. Adds debug IDs to
// bundles so stack traces in Sentry can be symbolicated back to real
// file/line numbers (otherwise reports show minified gibberish). Behaves
// identically to the stock Expo config in every other respect.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = config;
