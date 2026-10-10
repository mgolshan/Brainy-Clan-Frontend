import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { DeviceInfo, Platform as ApiPlatform } from '@/api/types';

/** `device_name` + `platform` sent with every auth call (one `devices` row per token). */
export function getDeviceInfo(): DeviceInfo {
  const platform: ApiPlatform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const name =
    Device.deviceName ?? Device.modelName ?? (platform === 'web' ? 'Web browser' : platform);
  return { device_name: name.slice(0, 100), platform };
}
