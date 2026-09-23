import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const inMemoryStore = new Map<string, string>();

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        inMemoryStore.set(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`Error setting secure store item ${key}:`, error);
    inMemoryStore.set(key, value);
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return inMemoryStore.get(key) || null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`Error getting secure store item ${key}:`, error);
    return inMemoryStore.get(key) || null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      } else {
        inMemoryStore.delete(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`Error removing secure store item ${key}:`, error);
    inMemoryStore.delete(key);
  }
}

export const StorageKeys = {
  ACCESS_TOKEN: 'feastflow_access_token',
  REFRESH_TOKEN: 'feastflow_refresh_token',
  USER_DATA: 'feastflow_user_data',
  CURRENT_ADDRESS: 'feastflow_current_address',
};
