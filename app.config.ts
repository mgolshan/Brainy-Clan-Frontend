import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic app config on top of `app.json`: adds what depends on environment variables
 * (social sign-in, see README "Google and Facebook sign-in setup"). Values come from `.env`
 * locally and from EAS environment variables in cloud builds.
 *
 * - Google (native, react-native-nitro-google-signin): the plugin needs the reversed iOS client
 *   ID as a URL scheme. Without `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` a placeholder keeps iOS
 *   builds working (the Google button is then hidden on iOS).
 * - Facebook (browser OAuth via expo-auth-session): native builds receive the redirect on the
 *   `fb<APP_ID>` scheme, so it is registered next to `brainyclan`.
 */
const GOOGLE_PLACEHOLDER_SCHEME = 'com.googleusercontent.apps.not-configured';

/** `123-abc.apps.googleusercontent.com` -> `com.googleusercontent.apps.123-abc`. */
function reversedClientId(clientId: string | undefined): string {
  const prefix = clientId?.trim().replace(/\.apps\.googleusercontent\.com$/, '');
  return prefix ? `com.googleusercontent.apps.${prefix}` : GOOGLE_PLACEHOLDER_SCHEME;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  const baseScheme = typeof config.scheme === 'string' ? config.scheme : 'brainyclan';

  return {
    ...config,
    name: config.name ?? 'Brainy Clan',
    slug: config.slug ?? 'brainy-clan',
    scheme: facebookAppId ? [baseScheme, `fb${facebookAppId}`] : baseScheme,
    plugins: [
      ...(config.plugins ?? []),
      [
        'react-native-nitro-google-signin',
        { iosUrlScheme: reversedClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) },
      ],
    ],
  };
};
