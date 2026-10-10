import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * zustand StateStorage backed by expo-secure-store (Keychain / Keystore).
 * expo-secure-store has no web implementation, so web falls back to localStorage
 * (not secure; acceptable for development builds of the web target).
 */
const webStorage: StateStorage = {
  getItem: (name) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(name)),
  setItem: (name, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
  },
};

const nativeStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

export const secureStorage: StateStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
