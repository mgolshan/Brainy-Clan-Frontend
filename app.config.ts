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
 * - AdMob (react-native-google-mobile-ads, README "AdMob setup"): the native SDK needs the AdMob
 *   app IDs at build time (`ADMOB_IOS_APP_ID` / `ADMOB_ANDROID_APP_ID`); without them Google's
 *   sample app IDs are used, which only ever serve test ads. Ads are non-personalized only, so no
 *   App Tracking Transparency prompt (`NSUserTrackingUsageDescription`) is added.
 * - RevenueCat (react-native-purchases) needs no config plugin; its keys are runtime
 *   `EXPO_PUBLIC_REVENUECAT_*` variables.
 * - Sentry (README "Error monitoring — Sentry setup"): the `@sentry/react-native/expo` plugin
 *   adds the native source map / debug symbol upload to EAS builds. It is only added when
 *   `SENTRY_ORG` and `SENTRY_PROJECT` are set (the upload then also needs the
 *   `SENTRY_AUTH_TOKEN` EAS secret), so builds without Sentry keep working. The DSN is the
 *   runtime `EXPO_PUBLIC_SENTRY_DSN`.
 */
const GOOGLE_PLACEHOLDER_SCHEME = 'com.googleusercontent.apps.not-configured';

/** `123-abc.apps.googleusercontent.com` -> `com.googleusercontent.apps.123-abc`. */
/** Google's sample AdMob app IDs (test ads only). */
const ADMOB_SAMPLE_APP_ID = {
  ios: 'ca-app-pub-3940256099942544~1458002511',
  android: 'ca-app-pub-3940256099942544~3347511713',
} as const;

function reversedClientId(clientId: string | undefined): string {
  const prefix = clientId?.trim().replace(/\.apps\.googleusercontent\.com$/, '');
  return prefix ? `com.googleusercontent.apps.${prefix}` : GOOGLE_PLACEHOLDER_SCHEME;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim();
  const sentryOrg = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
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
      [
        'react-native-google-mobile-ads',
        {
          iosAppId: process.env.ADMOB_IOS_APP_ID?.trim() || ADMOB_SAMPLE_APP_ID.ios,
          androidAppId: process.env.ADMOB_ANDROID_APP_ID?.trim() || ADMOB_SAMPLE_APP_ID.android,
          // Google's own SKAdNetwork id (recommended by AdMob for iOS attribution, no tracking).
          skAdNetworkItems: ['cstr6suwn9.skadnetwork'],
        },
      ],
      ...(sentryOrg && sentryProject
        ? [
            [
              '@sentry/react-native/expo',
              {
                organization: sentryOrg,
                project: sentryProject,
                url: process.env.SENTRY_URL?.trim() || 'https://sentry.io/',
              },
            ] as [string, Record<string, string>],
          ]
        : []),
    ],
  };
};
