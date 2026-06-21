import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, SCHOOL_NAME } from '../constants';
import { Btn, Card, StatusRow, PageHdr } from '../ui';
import { loadSf2, autoDetectLayout } from './sf2';
import { loadLayoutSettings } from '../storage';
import { ParsedSf2 } from '../types';

export default function LoadScreen({ onLoaded }: { onLoaded: (p: ParsedSf2) => void }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('idle');
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null); setStep('picking');
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) { setStep('idle'); return; }
      const asset = res.assets[0];
      setStep('reading'); setBusy(true);
      const layout = await loadLayoutSettings();
      const parsed = await loadSf2(asset.uri, asset.name ?? 'SF2.xlsx', layout);
      autoDetectLayout(layout);
      setBusy(false);
      if (!parsed.currentColumn) {
        setError(`Today's date (day ${new Date().getDate()}) not found in row ${layout.date_row}. Check the file or open the Layout Wizard in Settings.`);
        setStep('idle'); return;
      }
      onLoaded(parsed);
    } catch (e) {
      setBusy(false); setStep('idle');
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg_main }}>
      <View style={s.hdr}>
        <Text style={s.hdrLabel}>ATSYS  •  {SCHOOL_NAME}</Text>
        <Text style={s.hdrTitle}>📂  Load SF2 File</Text>
        <Text style={s.hdrSub}>Pick the school's existing SF2 .xlsx. The file is moved into the app's work directory to preserve all formatting, images, and embedded content — no copy is made.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {busy ? (
          <View style={s.busyBox}>
            <ActivityIndicator color={C.primary_accent} size="large" />
            <Text style={s.busyText}>{step === 'picking' ? 'Opening file picker…' : 'Reading SF2 file…'}</Text>
          </View>
        ) : (
          <Btn label="📂  Pick SF2 File" onPress={pick} color={C.info} style={{ marginBottom: 14 }} />
        )}
        {error && (
          <View style={s.errBox}>
            <Text style={s.errIcon}>⚠️</Text>
            <Text style={s.errText}>{error}</Text>
          </View>
        )}
        <Card title="📋  HOW IT WORKS" hdrColor={C.primary}>
          <StatusRow icon="📂" label="Source file" value="Your picked .xlsx" />
          <StatusRow icon="➡️" label="Action" value="MOVED into app work directory" />
          <StatusRow icon="✅" label="Preserves" value="All styling, images, formulas" />
          <StatusRow icon="💾" label="Saves" value="Atomically on every scan" />
          <StatusRow icon="📤" label="Return" value="Share updated file to admin via any app" />
        </Card>
        <Card title="📐  DEFAULT LAYOUT (DepEd SF2)" hdrColor={C.warning} style={{ marginTop: 10 }}>
          <StatusRow icon="📅" label="Date row" value="Row 11" />
          <StatusRow icon="🔤" label="Day letter row" value="Row 12" />
          <StatusRow icon="👤" label="First student row" value="Row 13" />
          <StatusRow icon="📝" label="Name column" value="Column B (2)" />
          <StatusRow icon="#️⃣" label="Number column" value="Column A (1)" />
          <Text style={s.layoutNote}>Adjust in Settings → Layout Wizard if your file uses a different layout.</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hdr: { backgroundColor: C.primary_dark, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  hdrLabel: { color: C.primary_accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  hdrTitle: { color: C.text_primary, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  hdrSub: { color: C.text_secondary, fontSize: 12, lineHeight: 18 },
  busyBox: { alignItems: 'center', paddingVertical: 30, gap: 14 },
  busyText: { color: C.text_secondary, fontSize: 13 },
  errBox: { flexDirection: 'row', backgroundColor: '#b71c1c22', borderLeftWidth: 4, borderLeftColor: C.error, padding: 12, marginBottom: 14, gap: 10 },
  errIcon: { fontSize: 18 },
  errText: { flex: 1, color: '#ef9a9a', fontSize: 12, lineHeight: 18 },
  layoutNote: { color: C.text_secondary, fontSize: 11, marginTop: 10, fontStyle: 'italic' },
});
