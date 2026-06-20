import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const EULA_TEXT = `ATSYS Mobile — End User License Agreement (proof of concept)

By continuing, you agree that this software is provided "as is" for evaluating
the ATSYS mobile attendance workflow. It is licensed, non-transferable, and
revocable, for use in managing attendance in an educational setting.

This text is a placeholder for the full EULA already shipped with the PC app
(see EULA.txt in the desktop installer). Swap this component's content for
that file before distributing beyond this proof of concept.`;

interface Props {
  onAccept: () => void;
}

export default function EulaScreen({ onAccept }: Props) {
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 End User License Agreement</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.body}>{EULA_TEXT}</Text>
      </ScrollView>
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setAccepted((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>I have read and agree to the EULA</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, !accepted && styles.buttonDisabled]}
        disabled={!accepted}
        onPress={onAccept}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: '800', color: '#f8fafc', marginBottom: 16 },
  scroll: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, marginBottom: 16 },
  scrollContent: { padding: 16 },
  body: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#22d3ee', borderColor: '#22d3ee' },
  checkmark: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  checkboxLabel: { color: '#e2e8f0', fontSize: 14 },
  button: { backgroundColor: '#22d3ee', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
});
