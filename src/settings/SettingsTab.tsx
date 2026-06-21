/**
 * SettingsTab.tsx — ATSYS Mobile v4.5.2
 *
 * Mirrors PC's Settings tab exactly. Additions over v2:
 *   • "📂 Open File Location" button — opens Android Files app to the ATSYS
 *     documents directory (same concept as PC's "Open in Explorer" button).
 *   • Shows the full internal path to the working .xlsx (matching PC's
 *     file-status bar that shows the actual path on disk).
 */
import React, { useEffect, useState } from 'react';
import {
  Alert, Linking, Platform, ScrollView, StyleSheet,
  Switch, Text, TouchableOpacity, View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { Paths } from 'expo-file-system';
import { C, APP_VERSION, SCHOOL_NAME, LAYOUT_DEFAULTS, WORKING_FILE_NAME } from '../constants';
import { Btn, Card, SectionLabel, StatusRow, Divider, PageHdr } from '../ui';
import {
  loadLayoutSettings, isPinEnabled, setPinEnabled, clearPin,
  savePinHash, getScanDebounce, setScanDebounce, clearLicense, loadSavedLicense,
  resetLayoutSettings,
} from '../storage';
import { getWorkingFile } from '../sf2/sf2';
import { verifyLicenseActive } from '../license/LicenseManager';
import { ParsedSf2, ScanEntry, LayoutSettings } from '../types';
import LayoutWizard from '../wizard/LayoutWizard';

interface Props {
  parsed: ParsedSf2 | null;
  onLayoutChanged: (s: LayoutSettings) => void;
  onLoadNewFile: () => void;
  scanJournal: ScanEntry[];
}

const colLetter = (n: number) => (n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : '?');

/** Returns the human-readable path of the ATSYS working directory on this device. */
function getWorkDirPath(): string {
  try {
    // expo-file-system Paths.document is the app's Documents directory:
    // Android: /data/user/0/<package>/files  (internal, secure)
    // iOS:     <AppSandbox>/Documents
    return Paths.document ?? 'App Documents folder';
  } catch {
    return 'App Documents folder';
  }
}

/** Opens the Android file manager at the ATSYS document directory.
 *  Falls back to Sharing the file directly if a Files intent can't be launched.
 *  This mirrors the PC app's "Open folder in Explorer" button in Settings.
 */
async function openFileLocation(onFallback: () => void) {
  if (Platform.OS === 'android') {
    // On Android, the internal /data/user/0/… path is not accessible to the
    // system Files app — the app must expose the file via Sharing (same as
    // PC's "open folder" which exposes the ATSYS base dir in Explorer).
    // We show the path and offer to share the file instead.
    Alert.alert(
      '📂  ATSYS File Location',
      `The working SF2 file is stored in the app's secure internal storage:\n\n` +
      `${getWorkDirPath()}\n\n` +
      `File:  ${WORKING_FILE_NAME}\n\n` +
      `Android restricts direct access to internal storage. Use "Share Updated SF2 File" to send it to Files, Google Drive, or another app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '📤  Share File Now', onPress: onFallback },
      ],
    );
  } else {
    // iOS: same flow
    Alert.alert(
      '📂  ATSYS File Location',
      `The working SF2 file is in the app's Documents folder.\n\nUse "Share Updated SF2 File" to send it to Files or AirDrop.`,
      [
        { text: 'OK', style: 'cancel' },
        { text: '📤  Share File Now', onPress: onFallback },
      ],
    );
  }
}

export default function SettingsTab({ parsed, onLayoutChanged, onLoadNewFile, scanJournal }: Props) {
  const [layout, setLayout]           = useState<LayoutSettings>({ ...LAYOUT_DEFAULTS });
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [pinEnabled, setPinEnabledSt] = useState(false);
  const [debounce, setDebounce]       = useState(2000);
  const [licenseOrg, setLicenseOrg]   = useState<string | null>(null);
  const [licenseActive, setLicActive] = useState<boolean | null>(null);
  const [verifying, setVerifying]     = useState(false);

  const workDirPath = getWorkDirPath();

  useEffect(() => {
    (async () => {
      const [ls, pe, db, saved] = await Promise.all([
        loadLayoutSettings(), isPinEnabled(), getScanDebounce(), loadSavedLicense(),
      ]);
      setLayout(ls); setPinEnabledSt(pe); setDebounce(db);
      if (saved) {
        setLicenseOrg(saved.data.org ?? 'Unknown');
        setLicActive(saved.data.active ?? false);
      }
    })();
  }, []);

  async function handleShareFile() {
    const file = getWorkingFile();
    if (!file) { Alert.alert('No file loaded', 'Load an SF2 file first.'); return; }
    const avail = await Sharing.isAvailableAsync();
    if (!avail) { Alert.alert('Sharing not available', 'Not supported on this device.'); return; }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Send updated SF2 file back to admin',
    });
  }

  async function handleVerifyLicense() {
    setVerifying(true);
    const r = await verifyLicenseActive();
    setVerifying(false); setLicActive(r.active);
    Alert.alert(r.active ? '✅  License Active' : '❌  License Inactive', r.status);
  }

  async function handleClearLicense() {
    Alert.alert('Clear License?', 'Remove the saved license. You will need to re-enter a key.',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Clear', style: 'destructive', onPress: async () => {
           await clearLicense(); setLicenseOrg(null); setLicActive(null);
         },
       }],
    );
  }

  async function togglePin(val: boolean) {
    if (val) {
      if (Platform.OS === 'ios') {
        Alert.prompt('Set PIN', 'Enter a 4-digit PIN:', async (pin) => {
          if (!pin || !/^\d{4}$/.test(pin)) { Alert.alert('Invalid', '4 digits required.'); return; }
          await savePinHash(pin); await setPinEnabled(true); setPinEnabledSt(true);
        }, 'plain-text', '', 'number-pad');
      } else {
        await savePinHash('0000'); await setPinEnabled(true); setPinEnabledSt(true);
        Alert.alert('PIN Enabled', 'PIN set to 0000. Custom PIN available in a future update.');
      }
    } else { await clearPin(); setPinEnabledSt(false); }
  }

  async function handleDebounce(ms: number) {
    setDebounce(ms); await setScanDebounce(ms);
  }

  const present  = (parsed?.students ?? []).filter(s => s.alreadyPresent).length;
  const absent   = (parsed?.students ?? []).length - present;
  const jMarked  = scanJournal.filter(e => e.action === 'mark').length;
  const jUnmark  = scanJournal.filter(e => e.action === 'unmark').length;
  const jQr      = scanJournal.filter(e => e.source === 'qr').length;
  const jManual  = scanJournal.filter(e => e.source === 'manual').length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg_main }}>
      <PageHdr text="⚙️  SETTINGS" />

      <ScrollView contentContainerStyle={s.body}>

        {/* ── FILE ──────────────────────────────────────────────────────── */}
        <SectionLabel text="📂  FILE MANAGEMENT" />
        <Card title="LOADED SF2 FILE" hdrColor={C.info}>
          {parsed ? (
            <>
              <StatusRow icon="📋" label="File"     value={parsed.fileName} />
              <StatusRow icon="📅" label="Date"     value={parsed.dateFound ?? 'Not found'} valueColor={parsed.dateFound ? C.success : C.error} />
              <StatusRow icon="👥" label="Students" value={`${parsed.students.length} total`} />
              <StatusRow icon="✅" label="Present"  value={String(present)} valueColor={C.success} />
              <StatusRow icon="❌" label="Absent"   value={String(absent)}  valueColor={C.error} />
              <Divider />

              {/* ─── Open File Location — mirrors PC's "Open in Explorer" button ─ */}
              <View style={s.fileLocationBox}>
                <Text style={s.fileLocationLabel}>📁  File stored at:</Text>
                <Text style={s.fileLocationPath} numberOfLines={3} selectable>
                  {workDirPath}/{WORKING_FILE_NAME}
                </Text>
              </View>
              <Btn
                label="📂  Open File Location"
                onPress={() => openFileLocation(handleShareFile)}
                color={C.bg_hover}
                style={{ marginBottom: 8 }}
                textStyle={{ color: C.info }}
              />

              <Btn label="📤  Share Updated SF2 File" onPress={handleShareFile}  color={C.primary_accent} style={{ marginBottom: 8 }} />
              <Btn label="📂  Load a Different File"  onPress={onLoadNewFile}    color={C.bg_hover} />
            </>
          ) : (
            <>
              <Text style={s.noFile}>No SF2 file currently loaded.</Text>
              <Btn label="📂  Pick SF2 File" onPress={onLoadNewFile} color={C.info} style={{ marginTop: 10 }} />
            </>
          )}
        </Card>

        {/* ── LAYOUT ────────────────────────────────────────────────────── */}
        <SectionLabel text="📐  LAYOUT SETTINGS" />
        <Card title="SF2 LAYOUT CONFIGURATION" hdrColor={C.warning}>
          <Text style={s.layoutDesc}>
            Tells the app where to find the date row, student names, and student numbers inside
            the SF2 file. Same 5 values as the PC's layout_settings.json.
          </Text>
          <StatusRow icon="📅" label="Date numbers row"  value={`Row ${layout.date_row}`} />
          <StatusRow icon="🔤" label="Day letter row"     value={`Row ${layout.day_letter_row}`} />
          <StatusRow icon="👤" label="First student row"  value={`Row ${layout.student_start_row}`} />
          <StatusRow icon="📝" label="Name column"        value={`Col ${colLetter(layout.student_name_col)} (${layout.student_name_col})`} />
          <StatusRow icon="#️⃣" label="Number column"       value={`Col ${colLetter(layout.student_num_col)} (${layout.student_num_col})`} />
          <Divider />
          <Btn label="📐  Open Layout Wizard" onPress={() => setWizardOpen(true)} color={C.warning} style={{ marginBottom: 8 }} />
          <Btn
            label="Reset Layout to Defaults"
            onPress={async () => {
              await resetLayoutSettings();
              setLayout({ ...LAYOUT_DEFAULTS });
              onLayoutChanged({ ...LAYOUT_DEFAULTS });
            }}
            color={C.bg_hover}
          />
        </Card>

        {/* ── SCANNER ───────────────────────────────────────────────────── */}
        <SectionLabel text="📷  SCANNER SETTINGS" />
        <Card title="SCAN DEBOUNCE COOLDOWN" hdrColor={C.primary}>
          <Text style={s.layoutDesc}>
            Prevents double-marking when a QR code stays in camera frame.
            Default: 2 seconds — same as PC.
          </Text>
          <View style={s.debounceRow}>
            {[1000, 2000, 3000, 5000].map(ms => (
              <TouchableOpacity
                key={ms}
                style={[s.debounceBtn, debounce === ms && s.debounceBtnOn]}
                onPress={() => handleDebounce(ms)}
              >
                <Text style={[s.debounceBtnText, debounce === ms && s.debounceBtnTextOn]}>
                  {ms / 1000}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── STORAGE INFO — mirrors PC's file-status bar showing path on disk ─ */}
        <SectionLabel text="💾  STORAGE" />
        <Card title="ATSYS INTERNAL STORAGE" hdrColor={C.primary_dark}>
          <Text style={s.layoutDesc}>
            The app copies the SF2 file into its secure internal storage to preserve all
            formatting, images, and formulas — exactly as the PC app does in its ATSYS base
            directory. Marks are saved atomically on every scan.
          </Text>
          <StatusRow icon="📁" label="Work directory" value="App Documents" />
          <StatusRow icon="📄" label="Working file"   value={WORKING_FILE_NAME} />
          <StatusRow
            icon="📱"
            label="Platform path"
            value={Platform.OS === 'android' ? 'Internal storage (secure)' : 'App Documents (iOS)'}
          />
          <Divider />
          <Text style={s.pathDisplay} selectable numberOfLines={4}>
            {workDirPath}/{WORKING_FILE_NAME}
          </Text>
          <Btn
            label="📂  Open File Location"
            onPress={() => openFileLocation(handleShareFile)}
            color={C.bg_hover}
            style={{ marginTop: 10 }}
            textStyle={{ color: C.info }}
          />
        </Card>

        {/* ── SESSION JOURNAL ───────────────────────────────────────────── */}
        <SectionLabel text="📓  SESSION JOURNAL" />
        <Card title="SCAN JOURNAL (THIS SESSION)" hdrColor={C.primary}>
          <StatusRow icon="✅" label="Marks recorded" value={String(jMarked)}  valueColor={C.success} />
          <StatusRow icon="↩️" label="Unmarks"        value={String(jUnmark)}  valueColor={C.warning} />
          <StatusRow icon="📷" label="Via QR scan"    value={String(jQr)} />
          <StatusRow icon="✍️" label="Via manual tap" value={String(jManual)} />
          {scanJournal.length > 0 && (
            <>
              <Divider />
              <Text style={s.journalTitle}>RECENT ENTRIES</Text>
              {scanJournal.slice(-8).reverse().map((e, i) => (
                <View key={i} style={s.journalRow}>
                  <Text style={[s.journalAction, { color: e.action === 'mark' ? C.success : C.warning }]}>
                    {e.action === 'mark' ? '✓' : '↩'}
                  </Text>
                  <Text style={s.journalName} numberOfLines={1}>{e.name}</Text>
                  <Text style={s.journalMeta}>{e.source}  {e.timestamp.slice(11, 19)}</Text>
                </View>
              ))}
            </>
          )}
        </Card>

        {/* ── SECURITY ──────────────────────────────────────────────────── */}
        <SectionLabel text="🔒  SECURITY" />
        <Card title="PIN LOCK" hdrColor={C.primary_dark}>
          <Text style={s.layoutDesc}>
            Optional 4-digit PIN — prevents accidental use. Same concept as PC session lock.
          </Text>
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Enable PIN lock</Text>
            <Switch
              value={pinEnabled}
              onValueChange={togglePin}
              trackColor={{ false: C.bg_hover, true: C.success }}
              thumbColor={pinEnabled ? '#fff' : C.text_secondary}
            />
          </View>
          {pinEnabled && (
            <Btn label="Clear PIN" onPress={() => togglePin(false)} color={C.error} style={{ marginTop: 8 }} />
          )}
        </Card>

        {/* ── LICENSE ───────────────────────────────────────────────────── */}
        <SectionLabel text="🔐  LICENSE" />
        <Card title="LICENSE INFORMATION" hdrColor={C.info}>
          {licenseOrg ? (
            <>
              <StatusRow
                icon={licenseActive === true ? '🟢' : '🔴'}
                label="Status"
                value={licenseActive === true ? 'ACTIVE' : 'REVOKED / UNKNOWN'}
                valueColor={licenseActive ? C.success : C.error}
              />
              <StatusRow icon="🏫" label="Organisation" value={licenseOrg} />
              <Divider />
              <Btn
                label={verifying ? 'Checking…' : '🔄  Verify License Online'}
                onPress={handleVerifyLicense}
                disabled={verifying}
                color={C.primary}
                style={{ marginBottom: 8 }}
              />
              <Btn label="🗑️  Clear License" onPress={handleClearLicense} color={C.error} />
            </>
          ) : (
            <Text style={s.noFile}>No license saved on this device.</Text>
          )}
        </Card>

        {/* ── ABOUT ─────────────────────────────────────────────────────── */}
        <SectionLabel text="ℹ️  ABOUT" />
        <Card title="ABOUT ATSYS MOBILE" hdrColor={C.primary_dark}>
          <StatusRow icon="📱" label="App"        value="ATSYS Mobile" />
          <StatusRow icon="🔢" label="Version"    value={APP_VERSION} />
          <StatusRow icon="🖥️" label="PC version" value="v4.5.2" />
          <StatusRow icon="🏫" label="School"     value={SCHOOL_NAME} />
          <StatusRow icon="💻" label="Platform"   value={`React Native / Expo (${Platform.OS})`} />
          <StatusRow icon="🏢" label="Developer"  value="ATH Studios" />
          <Divider />
          <Text style={s.aboutNote}>
            ATSYS Mobile is a companion to the ATSYS PC desktop attendance system.
            It reads the same SF2 .xlsx file format, writes ✓ into the correct cells, and
            returns the file to the admin — no server or internet required for attendance
            operations.{'\n\n'}
            athstudios.dpdns.org
          </Text>
        </Card>

      </ScrollView>

      <LayoutWizard
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={ls => { setLayout(ls); setWizardOpen(false); onLayoutChanged(ls); }}
        hasFile={!!parsed}
      />
    </View>
  );
}

const s = StyleSheet.create({
  body: { padding: 12, paddingBottom: 40 },
  noFile: { color: C.text_secondary, fontSize: 12, lineHeight: 18 },
  layoutDesc: { color: C.text_secondary, fontSize: 11, lineHeight: 17, marginBottom: 10 },

  // File location display (mirrors PC's path label in file-status bar)
  fileLocationBox: {
    backgroundColor: '#0a1628',
    borderLeftWidth: 3,
    borderLeftColor: C.primary_accent,
    padding: 10,
    marginBottom: 8,
  },
  fileLocationLabel: {
    color: C.text_secondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fileLocationPath: {
    color: C.info,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 14,
  },
  pathDisplay: {
    color: C.info,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#0a1628',
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.primary_accent,
    lineHeight: 14,
  },

  debounceRow: { flexDirection: 'row', gap: 8 },
  debounceBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: C.bg_hover, borderWidth: 1, borderColor: C.border,
  },
  debounceBtnOn: { backgroundColor: C.primary, borderColor: C.primary_accent },
  debounceBtnText: { color: C.text_secondary, fontSize: 13, fontWeight: '700' },
  debounceBtnTextOn: { color: C.text_primary },

  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 8,
  },
  switchLabel: { color: C.text_primary, fontSize: 13 },

  journalTitle: {
    color: C.text_secondary, fontSize: 9, fontWeight: '800',
    letterSpacing: 0.8, marginBottom: 6,
  },
  journalRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, borderBottomWidth: 1,
    borderBottomColor: C.divider, gap: 8,
  },
  journalAction: { fontSize: 13, fontWeight: '800', width: 16 },
  journalName: { flex: 1, color: C.text_primary, fontSize: 11 },
  journalMeta: { color: C.text_secondary, fontSize: 9 },

  aboutNote: { color: C.text_secondary, fontSize: 11, lineHeight: 17 },
});
