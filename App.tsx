import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import EulaScreen from './src/license/EulaScreen';
import LicenseEntryScreen from './src/license/LicenseEntryScreen';
import { verifyLicenseActive } from './src/license/LicenseManager';
import LoadScreen from './src/sf2/LoadScreen';
import ScanScreen from './src/scan/ScanScreen';
import { isEulaAccepted, setEulaAccepted } from './src/storage';
import { ParsedSf2 } from './src/types';
import { LICENSE_CHECK_INTERVAL_MS } from './src/constants';

type Step = 'bootstrapping' | 'eula' | 'license' | 'load_sf2' | 'scan';

export default function App() {
  const [step, setStep] = useState<Step>('bootstrapping');
  const [licenseMessage, setLicenseMessage] = useState<string | undefined>(undefined);
  const [parsedSf2, setParsedSf2] = useState<ParsedSf2 | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Bootstrap: EULA, then check for a saved + still-active license ────────
  useEffect(() => {
    (async () => {
      const eulaOk = await isEulaAccepted();
      if (!eulaOk) {
        setStep('eula');
        return;
      }
      await checkLicenseAndAdvance();
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkLicenseAndAdvance = useCallback(async () => {
    const { active, status } = await verifyLicenseActive();
    if (active) {
      setStep('load_sf2');
      startPeriodicCheck();
    } else {
      setLicenseMessage(status);
      setStep('license');
    }
  }, []);

  // ── Periodic re-verification — mirrors periodic_license_check on the PC. ──
  function startPeriodicCheck() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { active, status } = await verifyLicenseActive();
      if (!active) {
        if (pollRef.current) clearInterval(pollRef.current);
        setLicenseMessage(`License is no longer valid: ${status}`);
        setStep('license');
      }
    }, LICENSE_CHECK_INTERVAL_MS);
  }

  async function handleEulaAccept() {
    await setEulaAccepted();
    await checkLicenseAndAdvance();
  }

  function handleLicensed() {
    setLicenseMessage(undefined);
    setStep('load_sf2');
    startPeriodicCheck();
  }

  function handleSf2Loaded(parsed: ParsedSf2) {
    setParsedSf2(parsed);
    setStep('scan');
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {step === 'bootstrapping' && (
        <View style={styles.center}>
          <ActivityIndicator color="#22d3ee" size="large" />
          <Text style={styles.bootText}>Starting ATSYS…</Text>
        </View>
      )}
      {step === 'eula' && <EulaScreen onAccept={handleEulaAccept} />}
      {step === 'license' && (
        <LicenseEntryScreen reason={licenseMessage} onLicensed={handleLicensed} />
      )}
      {step === 'load_sf2' && <LoadScreen onLoaded={handleSf2Loaded} />}
      {step === 'scan' && parsedSf2 && <ScanScreen parsed={parsedSf2} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  bootText: { color: '#64748b', fontSize: 13, marginTop: 12 },
});
