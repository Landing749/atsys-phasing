import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C, LAYOUT_DEFAULTS } from '../constants';
import { Btn, Card, StatusRow, Divider } from '../ui';
import { autoDetectLayout } from '../sf2/sf2';
import { saveLayoutSettings, loadLayoutSettings, resetLayoutSettings } from '../storage';
import { LayoutSettings } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: (s: LayoutSettings) => void;
  hasFile: boolean;
}

const colLetter = (n: number) => (n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : '?');

const FIELDS: { key: keyof LayoutSettings; icon: string; label: string; hint: string }[] = [
  { key: 'date_row',          icon: '📅', label: 'Date numbers row',   hint: 'Row with day-of-month numbers 1-31' },
  { key: 'day_letter_row',    icon: '🔤', label: 'Day letter row',      hint: 'Row with M / T / W / Th / F abbreviations' },
  { key: 'student_start_row', icon: '👤', label: 'First student row',   hint: 'Row where the first student name appears' },
  { key: 'student_name_col',  icon: '📝', label: 'Student name column', hint: '1=A, 2=B, 3=C …' },
  { key: 'student_num_col',   icon: '#️⃣', label: 'Student number col',  hint: 'Column with student number (optional)' },
];

export default function LayoutWizard({ visible, onClose, onSaved, hasFile }: Props) {
  const [settings, setSettings]   = useState<LayoutSettings>({ ...LAYOUT_DEFAULTS });
  const [detected, setDetected]   = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [validErr, setValidErr]   = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const stored = await loadLayoutSettings();
      setSettings(stored);
      setSaved(false); setValidErr(null);
      if (hasFile) {
        const { detectedNames, ...vals } = autoDetectLayout(stored);
        setSettings(prev => ({ ...prev, ...vals }));
        setDetected(detectedNames ?? []);
      }
    })();
  }, [visible, hasFile]);

  function update(key: keyof LayoutSettings, raw: string) {
    const n = parseInt(raw, 10);
    setSettings(prev => ({ ...prev, [key]: isNaN(n) ? 0 : Math.max(0, n) }));
    setValidErr(null); setSaved(false);
  }

  function validate(): string | null {
    if (settings.student_start_row <= settings.date_row)
      return `First student row (${settings.student_start_row}) must be > date row (${settings.date_row}).`;
    if (settings.student_name_col < 1 || settings.student_name_col > 26)
      return 'Student name column must be 1–26.';
    return null;
  }

  async function handleSave() {
    const err = validate(); if (err) { setValidErr(err); return; }
    setSaving(true);
    await saveLayoutSettings(settings);
    setSaving(false); setSaved(true);
    onSaved(settings);
  }

  async function handleReset() {
    await resetLayoutSettings();
    setSettings({ ...LAYOUT_DEFAULTS }); setDetected([]); setValidErr(null); setSaved(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        {/* Header */}
        <View style={s.hdr}>
          <View>
            <Text style={s.hdrLabel}>LAYOUT WIZARD</Text>
            <Text style={s.hdrTitle}>📐  SF2 Layout Settings</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body}>
          {/* Auto-detect banner */}
          {hasFile ? (
            <View style={s.detectedBanner}>
              <Text style={s.detectedIcon}>🔍</Text>
              <Text style={s.detectedText}>Auto-detected values from your loaded SF2 file are shown below. Confirm they're correct, then tap Save.</Text>
            </View>
          ) : (
            <View style={s.noFileBanner}>
              <Text style={s.noFileIcon}>⚠️</Text>
              <Text style={s.noFileText}>No SF2 file loaded — auto-detection is unavailable. Edit values manually or load a file first.</Text>
            </View>
          )}

          {/* Fields */}
          <Card title="⚙️  LAYOUT VALUES" hdrColor={C.primary_accent}>
            {FIELDS.map(({ key, icon, label, hint }) => (
              <View key={key} style={s.field}>
                <View style={s.fieldLeft}>
                  <Text style={s.fieldIcon}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>{label}</Text>
                    <Text style={s.fieldHint}>{hint}</Text>
                  </View>
                </View>
                <View style={s.fieldRight}>
                  <TextInput
                    style={s.fieldInput} keyboardType="number-pad" selectTextOnFocus
                    value={String(settings[key])} onChangeText={v => update(key, v)}
                  />
                  {(key === 'student_name_col' || key === 'student_num_col') && (
                    <Text style={s.fieldColLetter}>Col {colLetter(settings[key])}</Text>
                  )}
                </View>
              </View>
            ))}
          </Card>

          {/* Detected student preview */}
          {detected.length > 0 && (
            <Card title="👁️  STUDENT NAME PREVIEW (first 5 detected)" hdrColor={C.info} style={{ marginTop: 10 }}>
              <Text style={s.previewNote}>These names found with current settings. If wrong, adjust rows/columns above.</Text>
              {detected.map((name, i) => (
                <View key={i} style={s.previewRow}>
                  <Text style={s.previewNum}>{i + 1}</Text>
                  <Text style={s.previewName}>{name}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Summary */}
          <Card title="📋  CURRENT SUMMARY" hdrColor={C.primary} style={{ marginTop: 10 }}>
            <StatusRow icon="📅" label="Date row"           value={`Row ${settings.date_row}`} />
            <StatusRow icon="🔤" label="Day letter row"      value={`Row ${settings.day_letter_row}`} />
            <StatusRow icon="👤" label="First student row"   value={`Row ${settings.student_start_row}`} />
            <StatusRow icon="📝" label="Name column"         value={`Col ${colLetter(settings.student_name_col)} (${settings.student_name_col})`} />
            <StatusRow icon="#️⃣" label="Number column"        value={`Col ${colLetter(settings.student_num_col)} (${settings.student_num_col})`} />
          </Card>

          {/* Validation error */}
          {validErr && <View style={s.validErr}><Text style={s.validErrText}>⚠️  {validErr}</Text></View>}

          {/* Saved */}
          {saved && <View style={s.savedBanner}><Text style={s.savedText}>✅  Layout saved. Reload your SF2 file to apply the new settings.</Text></View>}

          <Btn label={saving ? 'Saving…' : 'Save Layout Settings'} onPress={handleSave} loading={saving} color={C.success} style={{ marginBottom: 8 }} />
          <Btn label="Reset to Defaults" onPress={handleReset} color={C.warning} style={{ marginBottom: 8 }} />
          <Btn label="Cancel" onPress={onClose} color={C.bg_hover} style={{ marginBottom: 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg_main },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary_dark, paddingHorizontal: 18, paddingTop: 52, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  hdrLabel: { color: C.primary_accent, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  hdrTitle: { color: C.text_primary, fontSize: 17, fontWeight: '800' },
  closeBtn: { width: 34, height: 34, backgroundColor: C.bg_card, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: C.text_secondary, fontSize: 16, fontWeight: '700' },
  body: { padding: 14, paddingBottom: 40 },
  detectedBanner: { flexDirection: 'row', backgroundColor: '#0c2012', borderLeftWidth: 4, borderLeftColor: C.success, padding: 12, marginBottom: 12, gap: 8 },
  detectedIcon: { fontSize: 16 },
  detectedText: { flex: 1, color: '#a5d6a7', fontSize: 12, lineHeight: 17 },
  noFileBanner: { flexDirection: 'row', backgroundColor: '#2c1810', borderLeftWidth: 4, borderLeftColor: C.warning, padding: 12, marginBottom: 12, gap: 8 },
  noFileIcon: { fontSize: 16 },
  noFileText: { flex: 1, color: '#ffcc80', fontSize: 12, lineHeight: 17 },
  field: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
  fieldLeft: { flex: 1, flexDirection: 'row', gap: 8, paddingRight: 8 },
  fieldIcon: { fontSize: 17, marginTop: 1 },
  fieldLabel: { color: C.text_primary, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  fieldHint: { color: C.text_secondary, fontSize: 10, lineHeight: 14 },
  fieldRight: { alignItems: 'flex-end' },
  fieldInput: { backgroundColor: C.bg_hover, borderWidth: 1, borderColor: C.primary_accent, color: C.primary_accent, fontSize: 16, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 7, width: 68, textAlign: 'center' },
  fieldColLetter: { color: C.text_secondary, fontSize: 9, marginTop: 3, textAlign: 'center' },
  previewNote: { color: C.text_secondary, fontSize: 11, marginBottom: 8, lineHeight: 15 },
  previewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.divider },
  previewNum: { color: C.text_secondary, fontSize: 12, width: 26 },
  previewName: { color: C.text_primary, fontSize: 13, fontWeight: '600' },
  validErr: { backgroundColor: '#b71c1c22', borderLeftWidth: 4, borderLeftColor: C.error, padding: 12, marginBottom: 10 },
  validErrText: { color: '#ef9a9a', fontSize: 12, lineHeight: 17 },
  savedBanner: { backgroundColor: '#1b5e2022', borderLeftWidth: 4, borderLeftColor: C.success, padding: 12, marginBottom: 10 },
  savedText: { color: '#a5d6a7', fontSize: 12, fontWeight: '700' },
});
