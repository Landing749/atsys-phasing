import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SCAN_DEBOUNCE_MS } from '../constants';
import { getWorkingFile, markPresentAndSave, unmarkAndSave } from '../sf2/sf2';
import { ParsedSf2, Student } from '../types';

interface Props {
  parsed: ParsedSf2;
}

type ToastKind = 'ok' | 'warn' | 'error';

export default function ScanScreen({ parsed }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [students, setStudents] = useState<Student[]>(parsed.students);
  const [cameraOn, setCameraOn] = useState(true);
  const [toast, setToast] = useState<{ text: string; kind: ToastKind } | null>(null);
  const lastScan = useRef<{ value: string; at: number }>({ value: '', at: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentColumn = parsed.currentColumn as number; // LoadScreen already guards against null
  const presentCount = students.filter((s) => s.alreadyPresent).length;

  const showToast = useCallback((text: string, kind: ToastKind) => {
    setToast({ text, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const markStudent = useCallback(
    (target: Student) => {
      if (target.alreadyPresent) {
        showToast(`Already recorded: ${target.name}`, 'warn');
        return;
      }
      markPresentAndSave(target.row, currentColumn);
      setStudents((prev) =>
        prev.map((s) => (s.row === target.row ? { ...s, alreadyPresent: true } : s))
      );
      showToast(`Marked: ${target.name}`, 'ok');
    },
    [currentColumn, showToast]
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      const value = data.trim();
      const now = Date.now();
      // 2-second debounce per payload — same cooldown as the PC.
      if (value === lastScan.current.value && now - lastScan.current.at < SCAN_DEBOUNCE_MS) {
        return;
      }
      lastScan.current = { value, at: now };

      const target = students.find((s) => s.name === value);
      if (!target) {
        showToast('Not on roster', 'error');
        return;
      }
      markStudent(target);
    },
    [students, markStudent]
  );

  function handleTap(student: Student) {
    if (student.alreadyPresent) {
      unmarkAndSave(student.row, currentColumn);
      setStudents((prev) =>
        prev.map((s) => (s.row === student.row ? { ...s, alreadyPresent: false } : s))
      );
      showToast(`Unmarked: ${student.name}`, 'warn');
    } else {
      markStudent(student);
    }
  }

  async function handleShare() {
    const file = getWorkingFile();
    if (!file) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      showToast('Sharing is not available on this device', 'error');
      return;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Send updated SF2 file back to admin',
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.fileLabel} numberOfLines={1}>
          {parsed.fileName}
        </Text>
        <Text style={styles.counter}>
          {presentCount} / {students.length} present
        </Text>
      </View>

      <View style={styles.cameraSection}>
        {!permission?.granted ? (
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
        ) : cameraOn ? (
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={[styles.camera, styles.cameraOff]}>
            <Text style={styles.cameraOffText}>Camera paused</Text>
          </View>
        )}

        <TouchableOpacity style={styles.cameraToggle} onPress={() => setCameraOn((v) => !v)}>
          <Text style={styles.cameraToggleText}>{cameraOn ? '⏸ Pause' : '▶ Resume'}</Text>
        </TouchableOpacity>

        {toast && (
          <View style={[styles.toast, toastStyles[toast.kind]]}>
            <Text style={styles.toastText}>{toast.text}</Text>
          </View>
        )}
      </View>

      <Text style={styles.rosterLabel}>Roster — tap to mark / unmark</Text>
      <FlatList
        style={styles.roster}
        data={students}
        keyExtractor={(s) => String(s.row)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.rosterRow} onPress={() => handleTap(item)}>
            <View style={[styles.dot, item.alreadyPresent ? styles.dotOn : styles.dotOff]} />
            <Text style={styles.rosterName}>{item.name}</Text>
            {item.alreadyPresent && <Text style={styles.rosterCheck}>✓</Text>}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>📤 Share Updated File (verify in Excel)</Text>
      </TouchableOpacity>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  ok: { backgroundColor: '#16a34a' },
  warn: { backgroundColor: '#ca8a04' },
  error: { backgroundColor: '#dc2626' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  fileLabel: { color: '#94a3b8', fontSize: 12, flex: 1, marginRight: 8 },
  counter: { color: '#22d3ee', fontSize: 14, fontWeight: '800' },
  cameraSection: { height: 240, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  camera: { flex: 1 },
  cameraOff: { backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  cameraOffText: { color: '#64748b', fontSize: 13 },
  permissionButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  permissionButtonText: { color: '#22d3ee', fontWeight: '700' },
  cameraToggle: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#0f172acc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cameraToggleText: { color: '#f1f5f9', fontSize: 12, fontWeight: '700' },
  toast: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  rosterLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  roster: { flex: 1, paddingHorizontal: 16 },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  dotOn: { backgroundColor: '#4ade80' },
  dotOff: { backgroundColor: '#475569' },
  rosterName: { color: '#e2e8f0', fontSize: 14, flex: 1 },
  rosterCheck: { color: '#4ade80', fontWeight: '800' },
  shareButton: {
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  shareButtonText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
});
