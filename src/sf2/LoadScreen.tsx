import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { loadSf2 } from './sf2';
import { ParsedSf2 } from '../types';

interface Props {
  onLoaded: (parsed: ParsedSf2) => void;
}

export default function LoadScreen({ onLoaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setBusy(true);
      const parsed = await loadSf2(asset.uri, asset.name ?? 'SF2.xlsx');
      setBusy(false);

      if (parsed.currentColumn === null) {
        setError(
          "Today's date wasn't found in the layout's date row. Check the SF2 file matches the expected layout."
        );
        return;
      }
      onLoaded(parsed);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📂</Text>
      <Text style={styles.title}>Load the SF2 File</Text>
      <Text style={styles.subtitle}>
        Pick the school's existing SF2 .xlsx — the same file the PC app uses. Nothing is
        generated here; this just reads the file and finds today's column.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handlePick} disabled={busy}>
        {busy ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.buttonText}>Pick SF2 File</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  icon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#f8fafc', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  button: { backgroundColor: '#22d3ee', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
  error: { color: '#f87171', fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
