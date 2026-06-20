import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedLicense } from './types';

const KEYS = {
  eula: 'atsys_eula_accepted',
  license: 'atsys_license',
  deviceIdHash: 'atsys_device_id_hash',
};

/** Mirrors LicenseManager.eula_accepted() on the PC. */
export async function isEulaAccepted(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.eula)) === 'true';
}

/** Mirrors LicenseManager.accept_eula() on the PC. */
export async function setEulaAccepted(): Promise<void> {
  await AsyncStorage.setItem(KEYS.eula, 'true');
}

/** Mirrors LicenseManager.load_saved_license() on the PC. */
export async function loadSavedLicense(): Promise<SavedLicense | null> {
  const raw = await AsyncStorage.getItem(KEYS.license);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedLicense;
  } catch {
    return null;
  }
}

/** Mirrors LicenseManager.save_license() on the PC. */
export async function saveLicense(license: SavedLicense): Promise<void> {
  await AsyncStorage.setItem(KEYS.license, JSON.stringify(license));
}

/** Mirrors LicenseManager.clear_license() on the PC. */
export async function clearLicense(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.license);
}

export async function getCachedDeviceIdHash(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.deviceIdHash);
}

export async function setCachedDeviceIdHash(hash: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.deviceIdHash, hash);
}
