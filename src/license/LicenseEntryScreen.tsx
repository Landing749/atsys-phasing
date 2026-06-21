import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, SCHOOL_NAME } from '../constants';
import { Btn, Card, StatusRow } from '../ui';
import { validateLicense } from './LicenseManager';
import { clearLicense, loadSavedLicense } from '../storage';

export default function LicenseEntryScreen({ reason, onLicensed }: { reason?: string; onLicensed: () => void }) {
  const [key, setKey]       = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState<string | null>(reason ?? null);
  const [isErr, setIsErr]   = useState(!!reason);
  const [savedOrg, setSavedOrg] = useState<string | null>(null);

  useEffect(() => {
    loadSavedLicense().then(s => { if (s) setSavedOrg(s.data.org ?? 'Unknown'); });
  }, []);

  async function activate() {
    setBusy(true); setMsg('Validating license…'); setIsErr(false);
    const r = await validateLicense(key);
    setBusy(false);
    if (r.valid) { setMsg('✅  License active.'); setIsErr(false); setTimeout(onLicensed, 300); }
    else { setMsg(r.message); setIsErr(true); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg_main }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.hdr}>
        <Text style={s.hdrLabel}>ATSYS MOBILE  •  {SCHOOL_NAME}</Text>
        <Text style={s.icon}>🔑</Text>
        <Text style={s.title}>License Required</Text>
        <Text style={s.sub}>Enter the license key issued by your administrator.{'\n'}Works offline after first activation — same as the PC.</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {savedOrg && (
          <Card title="💾  SAVED LICENSE" hdrColor={C.info} style={{ marginBottom: 10 }}>
            <StatusRow icon="🏫" label="Organisation" value={savedOrg} valueColor={C.success} />
            <Btn label="🗑️  Clear saved license" onPress={async () => { await clearLicense(); setSavedOrg(null); }} color={C.error} style={{ marginTop: 10 }} />
          </Card>
        )}
        <Card title="🔐  ACTIVATE LICENSE" hdrColor={C.primary_accent}>
          <Text style={s.inputLabel}>License Key</Text>
          <TextInput
            style={s.input} placeholder="Enter license key" placeholderTextColor={C.border}
            autoCapitalize="none" autoCorrect={false} value={key} onChangeText={setKey}
            editable={!busy} onSubmitEditing={activate} returnKeyType="done"
          />
          {msg && <View style={[s.msgBox, isErr ? s.msgErr : s.msgOk]}><Text style={s.msgText}>{msg}</Text></View>}
          {busy && <View style={s.busyRow}><ActivityIndicator color={C.primary_accent} size="small" /><Text style={s.busyText}>Connecting to license server…</Text></View>}
          <Btn label="Activate" onPress={activate} disabled={busy || !key.trim()} loading={busy} color={C.primary} />
        </Card>
        <View style={s.infoBox}>
          <Text style={s.infoIcon}>ℹ️</Text>
          <Text style={s.infoText}>Hardware-locked to this device on first activation. Same licensing system as the ATSYS PC app. Requires internet once; works offline after that.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hdr: { backgroundColor: C.primary_dark, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 22, alignItems: 'center' },
  hdrLabel: { color: C.primary_accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  icon: { fontSize: 40, marginBottom: 6 },
  title: { color: C.text_primary, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  sub: { color: C.text_secondary, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  body: { padding: 16, paddingBottom: 40 },
  inputLabel: { color: C.text_secondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: C.bg_hover, paddingHorizontal: 14, paddingVertical: 12, color: C.text_primary, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  msgBox: { padding: 10, marginBottom: 10 },
  msgErr: { backgroundColor: '#b71c1c33', borderLeftWidth: 3, borderLeftColor: C.error },
  msgOk: { backgroundColor: '#1b5e2033', borderLeftWidth: 3, borderLeftColor: C.success },
  msgText: { color: C.text_primary, fontSize: 12, lineHeight: 17 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  busyText: { color: C.text_secondary, fontSize: 12 },
  infoBox: { flexDirection: 'row', backgroundColor: C.bg_card, padding: 14, marginTop: 6, gap: 10 },
  infoIcon: { fontSize: 15 },
  infoText: { flex: 1, color: C.text_secondary, fontSize: 11, lineHeight: 17 },
});
