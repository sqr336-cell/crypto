import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small key-value wrapper. Every call is guarded: storage can be unavailable
 * (private browsing, quota) and the app must keep working without it.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore: persistence is a convenience here.
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await storage.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setJSON(key: string, value: unknown): Promise<void> {
    await storage.set(key, JSON.stringify(value));
  },
};
