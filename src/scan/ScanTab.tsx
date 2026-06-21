import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants';
import { Toast, CounterCard, Btn, Card, StatusRow } from '../ui';
import { markPresentAndSave } from '../sf2/sf2';
import { ParsedSf2, Student, ScanEntry } from '../types';

interface Props {
  parsed: ParsedSf2;
  students: Student[];
  onStudentsChange: (s: Student[]) => void;
  scanDebounceMs: number;
  onAddJournal: (e: ScanEntry) => void;
}

export default function ScanTab({ parsed, students, onStudentsChange, scanDebounceMs, onAddJournal }: Props) {
  const [perm, requestPerm] = useCameraPermissions();
  const [cameraOn, setCameraOn]   = useState(true);
  const [torchOn, setTorchOn]     = useState(false);
  const [toast, setToast]         = useState<{ text: string; kind: 'ok' | 'warn' | 'error' } | null>(null);
  const [lastName, setLastName]   = useState<string | null>(null);
  const lastScan = useRef<{ v: string; t: number }>({ v: '', t: 0 });
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const present = students.filter(s => s.alreadyPresent).length;
  const absent  = students.length - present;
  const col     = parsed.currentColumn as number;

  const showToast = useCallback((text: string, kind: 'ok' | 'warn' | 'error') => {
    setToast({ text, kind });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const mark = useCallback((t: Student) => {
    if (t.alreadyPresent) { showToast(`Already recorded: ${t.name}`, 'warn'); return; }
    markPresentAndSave(t.row, col);
    onStudentsChange(students.map(s => s.row === t.row ? { ...s, alreadyPresent: true } : s));
    showToast(`✓  Marked: ${t.name}`, 'ok');
    setLastName(t.name);
    onAddJournal({ name: t.name, timestamp: new Date().toISOString(), source: 'qr', action: 'mark' });
  }, [col, students, onStudentsChange, showToast, onAddJournal]);

  const onScanned = useCallback(({ data }: { data: string }) => {
    const v = data.trim(); const now = Date.now();
    if (v === lastScan.current.v && now - lastScan.current.t < scanDebounceMs) return;
    lastScan.current = { v, t: now };
    const t = students.find(s => s.name === v);
    if (!t) { showToast(`Not on roster: ${v.slice(0, 36)}`, 'error'); return; }
    mark(t);
  }, [students, mark, showToast, scanDebounceMs]);

  if (!parsed.currentColumn) {
    return (
      <View style={s.block}>
        <View style={s.dateBlockBanner}>
          <Text style={s.dateBlockText}>⛔  Date column not found in the SF2 file.{'\n'}Open Settings → Layout Wizard to adjust the date row.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg_main }}>
      {/* LEFT: Camera — mirrors PC's left_frame */}
      <View style={s.cameraCard}>
        {/* Camera header */}
        <View style={s.camHdr}>
          <Text style={s.camHdrText}>📷  CAMERA FEED  (QR)</Text>
        </View>
        {/* Blinking ticker — mirrors PC's red ticker bar */}
        <View style={s.tickerBar}>
          <Text style={s.tickerText}>⛔  DO NOT OPEN THE SF2 FILE WHILE SCANNING  —  IT WILL CORRUPT THE FILE  ⛔</Text>
        </View>
        {/* Camera */}
        <View style={s.cameraBox}>
          {!perm?.granted ? (
            <View style={s.permBox}>
              <Text style={s.permIcon}>📷</Text>
              <Text style={s.permText}>Camera access required to scan QR codes.</Text>
              <Btn label="Allow Camera" onPress={requestPerm} color={C.info} style={{ marginTop: 12 }} />
            </View>
          ) : cameraOn ? (
            <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScanned} enableTorch={torchOn} />
          ) : (
            <View style={s.camPaused}><Text style={s.camPausedText}>⏸  Camera paused</Text></View>
          )}
          {/* Corner guides */}
          {perm?.granted && cameraOn && <>
            <View style={[s.corner, s.cTL]} /><View style={[s.corner, s.cTR]} />
            <View style={[s.corner, s.cBL]} /><View style={[s.corner, s.cBR]} />
          </>}
          {toast && <Toast text={toast.text} kind={toast.kind} />}
        </View>

        {/* Last scanned pill */}
        {lastName && (
          <View style={s.lastScan}>
            <Text style={s.lastScanLabel}>Last scanned:</Text>
            <Text style={s.lastScanName} numberOfLines={1}>{lastName}</Text>
          </View>
        )}
      </View>

      {/* RIGHT: Status + Counters + Controls — mirrors PC's right_frame (280px) */}
      <View style={s.rightPanel}>
        {/* System status card */}
        <Card title="📊 SYSTEM STATUS" hdrColor={C.info}>
          <StatusRow icon="📄" label="File" value={parsed.fileName} />
          <StatusRow icon="📅" label="Date" value={parsed.dateFound ?? 'Not found'} valueColor={parsed.dateFound ? C.success : C.error} />
          <StatusRow icon="👥" label="Students" value={String(students.length)} />
        </Card>

        {/* Counter cards — exact mirror: green/red/blue */}
        <View style={s.countersRow}>
          <CounterCard icon="✅" label="PRESENT" value={present} color={C.success} />
          <CounterCard icon="❌" label="ABSENT"  value={absent}  color={C.error} />
          <CounterCard icon="👥" label="TOTAL"   value={students.length} color={C.primary} />
        </View>

        {/* Camera controls — mirrors PC's ctrl_card */}
        <Card title="🎬  CAMERA CONTROLS" hdrColor={C.primary}>
          <View style={s.camCtrlRow}>
            <Btn label="▶  START" onPress={() => setCameraOn(true)}  color={C.success} style={s.camCtrlBtn} />
            <Btn label="⏹  STOP"  onPress={() => setCameraOn(false)} color={C.error}   style={s.camCtrlBtn} />
          </View>
          <TouchableOpacity style={[s.torchBtn, torchOn && s.torchBtnOn]} onPress={() => setTorchOn(v => !v)}>
            <Text style={s.torchText}>{torchOn ? '🔦  TORCH ON' : '💡  TORCH OFF'}</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </View>
  );
}

const CRN = 20;
const s = StyleSheet.create({
  block: { flex: 1, backgroundColor: C.bg_main },
  dateBlockBanner: { backgroundColor: '#7f0000', padding: 16, margin: 12 },
  dateBlockText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 20 },

  cameraCard: { flex: 1, backgroundColor: C.bg_card },
  camHdr: { backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 10 },
  camHdrText: { color: C.text_primary, fontSize: 12, fontWeight: '800' },
  tickerBar: { backgroundColor: '#b71c1c', paddingHorizontal: 10, paddingVertical: 5 },
  tickerText: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  cameraBox: { height: 200, backgroundColor: C.bg_hover, position: 'relative', overflow: 'hidden' },
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  permIcon: { fontSize: 32, marginBottom: 8 },
  permText: { color: C.text_secondary, fontSize: 13, textAlign: 'center' },
  camPaused: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary_dark },
  camPausedText: { color: C.text_secondary, fontSize: 14, fontWeight: '700' },
  corner: { position: 'absolute', width: CRN, height: CRN, borderColor: C.primary_accent, borderWidth: 3 },
  cTL: { top: 8,  left: 8,  borderRightWidth: 0, borderBottomWidth: 0 },
  cTR: { top: 8,  right: 8, borderLeftWidth: 0,  borderBottomWidth: 0 },
  cBL: { bottom: 8, left: 8,  borderRightWidth: 0, borderTopWidth: 0 },
  cBR: { bottom: 8, right: 8, borderLeftWidth: 0,  borderTopWidth: 0 },
  lastScan: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg_hover, paddingHorizontal: 12, paddingVertical: 7, gap: 8 },
  lastScanLabel: { color: C.text_secondary, fontSize: 10, fontWeight: '700' },
  lastScanName: { flex: 1, color: C.success, fontSize: 13, fontWeight: '800' },

  rightPanel: { backgroundColor: C.bg_main, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8 },
  countersRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  camCtrlRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  camCtrlBtn: { flex: 1 },
  torchBtn: { backgroundColor: C.bg_hover, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  torchBtnOn: { backgroundColor: C.primary_accent, borderColor: C.primary_accent },
  torchText: { color: C.text_primary, fontSize: 12, fontWeight: '700' },
});
