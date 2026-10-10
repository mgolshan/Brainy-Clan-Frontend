import Constants from 'expo-constants';

/**
 * Runtime configuration. Only EXPO_PUBLIC_* variables are inlined into the bundle,
 * and they must be read as `process.env.EXPO_PUBLIC_X` (no destructuring).
 */
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export const env = {
  /** Laravel backend origin, without trailing slash. e.g. http://192.168.1.50:8080 */
  API_URL: rawApiUrl.replace(/\/+$/, ''),
  /** App version from app.json (`expo.version`), sent as `X-App-Version`. */
  APP_VERSION: Constants.expoConfig?.version ?? '0.0.0',
} as const;

export const API_URL = env.API_URL;
export const APP_VERSION = env.APP_VERSION;
