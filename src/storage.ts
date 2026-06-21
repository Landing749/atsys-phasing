import AsyncStorage from '@react-native-async-storage/async-storage';
import { LayoutSettings, SavedLicense } from './types';
import { LAYOUT_DEFAULTS } from './constants';

const K = {
  eula:           'atsys_eula_accepted',
  license:        'atsys_license',
  deviceIdHash:   'atsys_device_id_hash',
  layoutSettings: 'atsys_layout_settings',
  pinEnabled:     'atsys_pin_enabled',
  pinHash:        'atsys_pin_hash',
  scanDebounce:   'atsys_scan_debounce',
};

export async function isEulaAccepted()       { return (await AsyncStorage.getItem(K.eula)) === 'true'; }
export async function setEulaAccepted()      { await AsyncStorage.setItem(K.eula, 'true'); }

export async function loadSavedLicense(): Promise<SavedLicense | null> {
  const r = await AsyncStorage.getItem(K.license);
  if (!r) return null;
  try { return JSON.parse(r); } catch { return null; }
}
export async function saveLicense(l: SavedLicense) { await AsyncStorage.setItem(K.license, JSON.stringify(l)); }
export async function clearLicense()               { await AsyncStorage.removeItem(K.license); }

export async function getCachedDeviceIdHash()           { return AsyncStorage.getItem(K.deviceIdHash); }
export async function setCachedDeviceIdHash(h: string)  { await AsyncStorage.setItem(K.deviceIdHash, h); }

export async function loadLayoutSettings(): Promise<LayoutSettings> {
  const r = await AsyncStorage.getItem(K.layoutSettings);
  if (!r) return { ...LAYOUT_DEFAULTS };
  try { return { ...LAYOUT_DEFAULTS, ...JSON.parse(r) }; } catch { return { ...LAYOUT_DEFAULTS }; }
}
export async function saveLayoutSettings(s: LayoutSettings)  { await AsyncStorage.setItem(K.layoutSettings, JSON.stringify(s)); }
export async function resetLayoutSettings()                   { await AsyncStorage.removeItem(K.layoutSettings); }

export async function getScanDebounce(): Promise<number> {
  const r = await AsyncStorage.getItem(K.scanDebounce);
  return r ? parseInt(r, 10) : 2000;
}
export async function setScanDebounce(ms: number) { await AsyncStorage.setItem(K.scanDebounce, String(ms)); }

export async function isPinEnabled()              { return (await AsyncStorage.getItem(K.pinEnabled)) === 'true'; }
export async function setPinEnabled(v: boolean)   { await AsyncStorage.setItem(K.pinEnabled, v ? 'true' : 'false'); }
export async function getSavedPinHash()           { return AsyncStorage.getItem(K.pinHash); }
export async function savePinHash(h: string)      { await AsyncStorage.setItem(K.pinHash, h); }
export async function clearPin()                  { await AsyncStorage.multiRemove([K.pinEnabled, K.pinHash]); }
