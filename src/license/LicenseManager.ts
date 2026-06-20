import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { FIREBASE_CONFIG } from '../constants';
import {
  getCachedDeviceIdHash,
  loadSavedLicense,
  saveLicense,
  setCachedDeviceIdHash,
} from '../storage';
import { LicenseInfo, SavedLicense } from '../types';

const FETCH_TIMEOUT_MS = 10000;
const CONNECTIVITY_PROBE_TIMEOUT_MS = 4000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Equivalent of HardwareDetector.get_machine_id() on the PC.
 * The PC hashes a WMI UUID; mobile doesn't have that, so we hash the Android ID
 * instead. Cached locally so it's only computed once per install, same as the PC
 * caches machine_id.txt.
 */
export async function getDeviceIdHash(): Promise<string> {
  const cached = await getCachedDeviceIdHash();
  if (cached) return cached;

  let raw: string;
  try {
    raw = Application.getAndroidId() ?? `fallback-${Date.now()}`;
  } catch {
    raw = `fallback-${Date.now()}`;
  }

  const fullHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  const shortHash = fullHash.slice(0, 16);
  await setCachedDeviceIdHash(shortHash);
  return shortHash;
}

/**
 * Generic internet-reachability probe — deliberately NOT pointed at Firebase.
 * "Mobile data is on" (radio connected) is not the same as "there is a real
 * route to the internet": weak signal, a captive portal, or a DNS hiccup can
 * all leave the radio "open" with no actual connectivity, which previously
 * showed up as a false positive because the old check pinged our own
 * Firebase endpoint and conflated "Firebase is up" with "internet exists".
 * Uses the same generate_204 style endpoint Android's own connectivity
 * checker relies on — a tiny, fast, no-body response. A non-204 response
 * (e.g. a captive portal login page returning 200 with HTML) is treated as
 * "no real internet", matching Android's own semantics.
 */
export async function isOnline(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      'https://connectivitycheck.gstatic.com/generate_204',
      { method: 'GET' },
      CONNECTIVITY_PROBE_TIMEOUT_MS
    );
    return res.status === 204;
  } catch {
    return false;
  }
}

async function fetchLicenses(): Promise<Record<string, LicenseInfo> | null> {
  try {
    const res = await fetchWithTimeout(`${FIREBASE_CONFIG.databaseURL}/licenses.json`);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, LicenseInfo>;
  } catch {
    return null;
  }
}

/**
 * Equivalent of HardwareReporter.check_and_lock_device() on the PC — ONE device
 * per license. Fails open on any network error/timeout so an offline classroom
 * is never blocked by a server hiccup, exactly like the PC's fail-open behaviour.
 */
async function checkAndLockDevice(
  licenseKey: string,
  deviceIdHash: string
): Promise<{ allowed: boolean; reason: string }> {
  const url = `${FIREBASE_CONFIG.databaseURL}/licenses/${licenseKey}/device_lock.json`;
  try {
    const getRes = await fetchWithTimeout(url);
    if (!getRes.ok) return { allowed: true, reason: 'check_http_error' };

    const lock = await getRes.json();
    if (lock === null) {
      // No lock yet — this device is first, so it gets locked in.
      const putRes = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceIdHash, locked_at: new Date().toISOString() }),
      });
      return putRes.ok
        ? { allowed: true, reason: 'locked' }
        : { allowed: true, reason: 'lock_write_failed' };
    }

    if (lock.device_id === deviceIdHash) {
      return { allowed: true, reason: 'matched' };
    }

    return {
      allowed: false,
      reason:
        'This license is already in use on another device. It is hardware-locked to the device that activated it first. Contact your administrator to reset the device lock.',
    };
  } catch {
    return { allowed: true, reason: 'network_error' };
  }
}

/**
 * Equivalent of report_hardware_to_firebase() + check_for_license_sharing() on
 * the PC, combined. The PC assigns sequential HWID_PRIMARY / HWID_SECONDARY
 * labels via a local counter; mobile simplifies this by keying each device
 * directly off its hashed device ID, which is simpler and avoids needing a
 * separate counter file.
 */
async function reportAndCheckSharing(
  licenseKey: string,
  deviceIdHash: string
): Promise<{ isSharing: boolean; deviceCount: number }> {
  const hardwareNodeUrl = `${FIREBASE_CONFIG.databaseURL}/licenses/${licenseKey}/hardware.json`;
  const thisDeviceUrl = `${FIREBASE_CONFIG.databaseURL}/licenses/${licenseKey}/hardware/${deviceIdHash}.json`;
  try {
    await fetchWithTimeout(thisDeviceUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedAt: new Date().toISOString() }),
    });

    const res = await fetchWithTimeout(hardwareNodeUrl);
    if (!res.ok) return { isSharing: false, deviceCount: 1 };
    const hardware = (await res.json()) as Record<string, unknown> | null;
    const count = hardware ? Object.keys(hardware).length : 1;
    return { isSharing: count > 1, deviceCount: count };
  } catch {
    return { isSharing: false, deviceCount: 1 };
  }
}

/** Equivalent of LicenseManager.validate_license() on the PC — used for first-time entry. */
export async function validateLicense(
  licenseKey: string
): Promise<{ valid: boolean; info?: LicenseInfo; message: string }> {
  const trimmedKey = licenseKey.trim();
  if (!trimmedKey) {
    return { valid: false, message: 'Enter a license key.' };
  }

  const online = await isOnline();
  if (!online) {
    return {
      valid: false,
      message: 'No internet connection. Connect once to activate a new license, then it works offline.',
    };
  }

  const licenses = await fetchLicenses();
  if (!licenses) {
    return { valid: false, message: 'Could not reach the license server. Check your connection.' };
  }

  const info = licenses[trimmedKey];
  if (!info) {
    return { valid: false, message: 'License key not found.' };
  }
  if (!info.active) {
    return { valid: false, message: 'License has been revoked. Contact your administrator.' };
  }

  const deviceIdHash = await getDeviceIdHash();
  const lock = await checkAndLockDevice(trimmedKey, deviceIdHash);
  if (!lock.allowed) {
    return { valid: false, message: lock.reason };
  }

  await reportAndCheckSharing(trimmedKey, deviceIdHash);

  const saved: SavedLicense = { key: trimmedKey, data: info, savedAt: new Date().toISOString() };
  await saveLicense(saved);

  return { valid: true, info, message: 'Active' };
}

/**
 * Equivalent of LicenseManager.verify_license_active_online() on the PC.
 * Used both at launch and by the periodic poll. On mobile, offline is the
 * default state rather than a rare fallback, so the cached-active-flag path
 * is the primary path here, not an edge case.
 */
export async function verifyLicenseActive(): Promise<{ active: boolean; status: string }> {
  const saved = await loadSavedLicense();
  if (!saved) return { active: false, status: 'No license saved' };

  const online = await isOnline();
  if (!online) {
    const cachedActive = saved.data?.active ?? false;
    return {
      active: cachedActive,
      status: cachedActive ? 'Offline — using last known active status' : 'Offline — last known status was inactive',
    };
  }

  const licenses = await fetchLicenses();
  if (!licenses || !licenses[saved.key]) {
    // Server reachable but didn't return this key cleanly — fail back to cache
    // rather than punishing the teacher for a flaky connection mid-session.
    const cachedActive = saved.data?.active ?? false;
    return { active: cachedActive, status: 'Server unreachable — using cached status' };
  }

  const info = licenses[saved.key];
  if (info.active) {
    const deviceIdHash = await getDeviceIdHash();
    const lock = await checkAndLockDevice(saved.key, deviceIdHash);
    if (!lock.allowed) {
      return { active: false, status: lock.reason };
    }
    await reportAndCheckSharing(saved.key, deviceIdHash);
  }

  await saveLicense({ key: saved.key, data: info, savedAt: new Date().toISOString() });
  return { active: info.active, status: info.active ? 'Active' : 'Revoked' };
}