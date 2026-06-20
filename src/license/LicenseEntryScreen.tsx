import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { validateLicense } from './LicenseManager';

interface Props {
  reason?: string;
  onLicensed: () => void;
}

export default function LicenseEntryScreen({ reason, onLicensed }: Props) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(reason ?? null);
  const [isError, setIsError] = useState(!!reason);

  async function handleActivate() {
    setBusy(true);
    setMessage('Validating license…');
    setIsError(false);
    const result = await validateLicense(key);
    setBusy(false);
    if (result.valid) {
      setMessage('✅ License active.');
      setIsError(false);
      onLicensed();
    } else {
      setMessage(result.message);
      setIsError(true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.icon}>🔑</Text>
      <Text style={styles.title}>License Required</Text>
      <Text style={styles.subtitle}>
        Enter the license key issued by your administrator. Once validated, it's saved
        on this device and works offline — same as the PC app.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="License key"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        value={key}
        onChangeText={setKey}
        editable={!busy}
      />

      {message && (
        <Text style={[styles.message, isError ? styles.messageError : styles.messageOk]}>
          {message}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, (busy || !key.trim()) && styles.buttonDisabled]}
        disabled={busy || !key.trim()}
        onPress={handleActivate}
      >
        {busy ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.buttonText}>Activate</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  icon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#f8fafc', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 19 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f1f5f9',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  message: { fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  messageOk: { color: '#4ade80' },
  messageError: { color: '#f87171' },
  button: { backgroundColor: '#22d3ee', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
});
