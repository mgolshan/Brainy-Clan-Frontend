import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { DeviceInfo, Platform as ApiPlatform } from '@/api/types';
import i18n from '@/i18n';

/**
 * `device_name` + `platform` sent with every auth call (one `devices` row per token). The web
 * fallback name is stored by the server, so it is in the language used when signing in.
 */
export function getDeviceInfo(): DeviceInfo {
  const platform: ApiPlatform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const name =
    Device.deviceName ??
    Device.modelName ??
    (platform === 'web' ? i18n.t('devices.webBrowser') : platform);
  return { device_name: name.slice(0, 100), platform };
}
