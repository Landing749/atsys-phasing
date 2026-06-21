/**
 * App.tsx — ATSYS Mobile v4.5.2
 *
 * Tabs mirror the PC app notebook exactly:
 *   📊 DASHBOARD  ·  📷 SCAN  ·  ✍️ MANUAL  ·  🔲 QR  ·  📈 STATS  ·  ⚙️ SETTINGS
 *
 * Flow:
 *   bootstrapping → eula → license → load_sf2 → main (tabbed)
 *
 * Splash screen mirrors PC SplashScreen exactly:
 *   - Dark #0d1b2a background with #3949ab border glow
 *   - Top teal accent bar (#0097A7)
 *   - School logo LEFT | ATSYS brand CENTER | ATH Studios logo RIGHT
 *   - Progress bar + animated dots
 *   - Bottom copyright strip
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Image, Platform,
  SafeAreaView, StatusBar, StyleSheet, Text, View,
} from 'react-native';

import EulaScreen         from './src/license/EulaScreen';
import LicenseEntryScreen from './src/license/LicenseEntryScreen';
import { verifyLicenseActive } from './src/license/LicenseManager';
import LoadScreen         from './src/sf2/LoadScreen';
import DashboardTab       from './src/dashboard/DashboardTab';
import ScanTab            from './src/scan/ScanTab';
import ManualTab          from './src/manual/ManualTab';
import QrTab              from './src/qr/QrTab';
import StatsTab           from './src/stats/StatsTab';
import SettingsTab        from './src/settings/SettingsTab';

import { AppHeader, TabBar } from './src/ui';
import { isEulaAccepted, setEulaAccepted, getScanDebounce } from './src/storage';
import { unloadSf2 } from './src/sf2/sf2';
import { C, TABS, LICENSE_CHECK_INTERVAL_MS } from './src/constants';
import { ParsedSf2, Student, ScanEntry, LayoutSettings } from './src/types';

// ── Image assets ──────────────────────────────────────────────────────────────
const SCHOOL_LOGO = require('./assets/school_logo.png');
const ATH_LOGO    = require('./assets/athstudios_logo.png');

type Step    = 'bootstrapping' | 'eula' | 'license' | 'load_sf2' | 'main';
type TabKey  = 'dashboard' | 'scan' | 'manual' | 'qr' | 'stats' | 'settings';

// PC splash steps — exact mirror of _STEPS in SplashScreen class
const SPLASH_STEPS = [
  { pct: 0,   label: '🚀  Starting QR Attendance System…'   },
  { pct: 8,   label: '📦  Loading configuration…'           },
  { pct: 18,  label: '🎨  Applying theme & colour scheme…'  },
  { pct: 28,  label: '🔑  Initialising license manager…'    },
  { pct: 40,  label: '🌐  Connecting to license server…'    },
  { pct: 52,  label: '✅  Verifying credentials…'           },
  { pct: 62,  label: '📁  Setting up workspace…'            },
  { pct: 72,  label: '📊  Loading chart & report engine…'   },
  { pct: 82,  label: '🖥️   Building user interface…'        },
  { pct: 91,  label: '📄  Scanning for saved session…'      },
  { pct: 97,  label: '🔒  Starting license monitor…'        },
  { pct: 100, label: '✅  All systems ready — launching!'   },
];
const STEP_DELAY_MS = 220;

export default function App() {
  const [step, setStep]               = useState<Step>('bootstrapping');
  const [licenseMsg, setLicenseMsg]   = useState<string | undefined>();
  const [parsed, setParsed]           = useState<ParsedSf2 | null>(null);
  const [students, setStudents]       = useState<Student[]>([]);
  const [activeTab, setActiveTab]     = useState<TabKey>('dashboard');
  const [debounceMs, setDebounceMs]   = useState(2000);
  const [journal, setJournal]         = useState<ScanEntry[]>([]);

  // Splash animation state
  const [splashStep, setSplashStep]   = useState(0);
  const [dotCount, setDotCount]       = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Splash progress animation — mirrors PC's smooth 60fps bar ────────────
  useEffect(() => {
    if (step !== 'bootstrapping') return;
    let idx = 0;

    // Animated dots — mirrors PC's _TICK_MS dot counter
    dotRef.current = setInterval(() => setDotCount(d => (d + 1) % 4), 500);

    const advance = () => {
      if (idx >= SPLASH_STEPS.length) return;
      setSplashStep(idx);
      const target = SPLASH_STEPS[idx].pct;
      Animated.timing(progressAnim, {
        toValue: target,
        duration: STEP_DELAY_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => {
        idx++;
        if (idx < SPLASH_STEPS.length) setTimeout(advance, STEP_DELAY_MS);
      });
    };
    advance();

    return () => {
      if (dotRef.current) clearInterval(dotRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Bootstrap — runs after splash animation is underway ──────────────────
  useEffect(() => {
    (async () => {
      // Let the splash play at least a couple steps before checking
      await new Promise(r => setTimeout(r, STEP_DELAY_MS * 5));
      const eulaOk = await isEulaAccepted();
      if (!eulaOk) { setStep('eula'); return; }
      await checkLicense();
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkLicense = useCallback(async () => {
    const { active, status } = await verifyLicenseActive();
    if (active) { setStep('load_sf2'); startPoll(); }
    else { setLicenseMsg(status); setStep('license'); }
  }, []);

  function startPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { active, status } = await verifyLicenseActive();
      if (!active) {
        clearInterval(pollRef.current!);
        setLicenseMsg(`License no longer valid: ${status}`);
        setStep('license');
      }
    }, LICENSE_CHECK_INTERVAL_MS);
  }

  async function handleEulaAccept() { await setEulaAccepted(); await checkLicense(); }
  function handleLicensed()         { setLicenseMsg(undefined); setStep('load_sf2'); startPoll(); }

  async function handleSf2Loaded(p: ParsedSf2) {
    const db = await getScanDebounce();
    setDebounceMs(db); setParsed(p); setStudents(p.students);
    setJournal([]); setActiveTab('dashboard'); setStep('main');
  }

  function handleLoadNewFile() {
    unloadSf2(); setParsed(null); setStudents([]); setJournal([]); setStep('load_sf2');
  }

  function addJournal(e: ScanEntry) { setJournal(prev => [...prev, e]); }
  function handleLayoutChanged(_s: LayoutSettings) {}

  const statusText = parsed ? `${parsed.fileName.slice(0, 18)}…` : 'No file loaded';
  const dots       = '▪'.repeat(dotCount);
  const barWidth   = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1b2a" />

      {/* ═══════════════════════════════════════════════════════════════════
          BOOTSTRAPPING — PC-faithful splash screen
      ════════════════════════════════════════════════════════════════════ */}
      {step === 'bootstrapping' && (
        <View style={styles.splashOuter}>
          {/* 2px navy-blue glow border — mirrors PC outer Frame */}
          <View style={styles.splashBorder}>
            <View style={styles.splashInner}>

              {/* TOP TEAL ACCENT BAR — tk.Frame bg="#0097A7" height=4 */}
              <View style={styles.splashTealBar} />

              {/* HEADER SECTION — bg="#111d30" */}
              <View style={styles.splashHeader}>

                {/* Logo row: school LEFT | brand CENTER | ATH RIGHT */}
                <View style={styles.splashLogoRow}>

                  {/* LEFT — school logo (72×72 on PC) */}
                  <Image source={SCHOOL_LOGO} style={styles.splashSchoolLogo} resizeMode="contain" />

                  {/* CENTER — brand text */}
                  <View style={styles.splashBrandCol}>
                    <Text style={styles.splashATSYS}>ATSYS</Text>
                    <View style={styles.splashTagRow}>
                      <Text style={styles.splashTagDot}>•</Text>
                      <Text style={styles.splashTagText}>  Scan & Go</Text>
                    </View>
                    <Text style={styles.splashSubtitle}>QR Attendance System  by  ATH Studios</Text>
                  </View>

                  {/* RIGHT — ATH Studios logo (44×44 on PC) */}
                  <View style={styles.splashAthCol}>
                    <Image source={ATH_LOGO} style={styles.splashAthLogo} resizeMode="contain" />
                    <Text style={styles.splashAthLabel}>ATH Studios</Text>
                  </View>

                </View>

                {/* School name — mirrors PC's schoolName Label */}
                <Text style={styles.splashSchoolName}>
                  Dr. Alfredo Pio De Roda Elementary School
                </Text>
                <Text style={styles.splashLicenseLine}>
                  Mobile Companion  •  v4.5.2
                </Text>
              </View>

              {/* DIVIDER — mirrors PC's 1px #1e3a5f Frame */}
              <View style={styles.splashDivider} />

              {/* PROGRESS SECTION */}
              <View style={styles.splashProgSection}>
                {/* Progress bar — mirrors Splash.Horizontal.TProgressbar */}
                <View style={styles.splashBarTrough}>
                  <Animated.View style={[styles.splashBarFill, { width: barWidth }]} />
                </View>

                {/* Pct label — right-aligned, mirrors PC's pct_var Label */}
                <Text style={styles.splashPct}>
                  {SPLASH_STEPS[splashStep]?.pct ?? 0} %
                </Text>

                {/* Status text — mirrors PC's status_var Label */}
                <Text style={styles.splashStatus}>
                  {SPLASH_STEPS[splashStep]?.label ?? ''}
                </Text>

                {/* Animated dots — mirrors PC's dots_var Label (Consolas) */}
                <Text style={styles.splashDots}>{dots}</Text>
              </View>

              {/* BOTTOM STRIP — mirrors PC's bottom Frame */}
              <View style={styles.splashBottomDivider} />
              <View style={styles.splashBottom}>
                <Text style={styles.splashCopyright}>
                  © 2026 ATH Studios  •  athstudios.dpdns.org
                </Text>
                <ActivityIndicator color="#3949ab" size="small" />
              </View>

            </View>
          </View>
        </View>
      )}

      {/* ── EULA ──────────────────────────────────────────────────────────── */}
      {step === 'eula' && <EulaScreen onAccept={handleEulaAccept} />}

      {/* ── License ───────────────────────────────────────────────────────── */}
      {step === 'license' && (
        <LicenseEntryScreen reason={licenseMsg} onLicensed={handleLicensed} />
      )}

      {/* ── Load SF2 ──────────────────────────────────────────────────────── */}
      {step === 'load_sf2' && <LoadScreen onLoaded={handleSf2Loaded} />}

      {/* ── Main tabbed shell ─────────────────────────────────────────────── */}
      {step === 'main' && parsed && (
        <View style={styles.shell}>
          <AppHeader
            fileLoaded={!!parsed}
            dateFound={parsed.dateFound}
            statusText={statusText}
          />
          <View style={styles.headerDivider} />
          <View style={styles.tabContent}>
            {activeTab === 'dashboard' && (
              <DashboardTab
                parsed={parsed} students={students} scanJournal={journal}
                onLoadNewFile={handleLoadNewFile}
                onGoToTab={k => setActiveTab(k as TabKey)}
              />
            )}
            {activeTab === 'scan' && (
              <ScanTab
                parsed={parsed} students={students}
                onStudentsChange={setStudents}
                scanDebounceMs={debounceMs}
                onAddJournal={addJournal}
              />
            )}
            {activeTab === 'manual' && (
              <ManualTab
                parsed={parsed} students={students}
                onStudentsChange={setStudents}
                onAddJournal={addJournal}
              />
            )}
            {activeTab === 'qr' && (
              <QrTab parsed={parsed} students={students} />
            )}
            {activeTab === 'stats' && (
              <StatsTab parsed={parsed} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                parsed={parsed}
                onLayoutChanged={handleLayoutChanged}
                onLoadNewFile={handleLoadNewFile}
                scanJournal={journal}
              />
            )}
          </View>
          <TabBar tabs={TABS} active={activeTab} onSelect={k => setActiveTab(k as TabKey)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  },

  // ── Splash ──────────────────────────────────────────────────────────────
  splashOuter: {
    flex: 1,
    backgroundColor: '#0d1b2a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  splashBorder: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#3949ab',   // 2px glow border color (PC: outer Frame bg)
    padding: 2,
    borderRadius: 4,
  },
  splashInner: {
    backgroundColor: '#0d1b2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  splashTealBar: {
    height: 4,
    backgroundColor: '#0097A7',   // exact PC teal accent
  },
  splashHeader: {
    backgroundColor: '#111d30',   // exact PC header bg
    paddingBottom: 14,
  },
  splashLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  splashSchoolLogo: {
    width: 62,
    height: 62,
  },
  splashBrandCol: {
    flex: 1,
    paddingHorizontal: 14,
  },
  splashATSYS: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  splashTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  splashTagDot: {
    color: '#0097A7',
    fontSize: 14,
    fontWeight: '700',
  },
  splashTagText: {
    color: '#0097A7',
    fontSize: 13,
    fontStyle: 'italic',
  },
  splashSubtitle: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 3,
  },
  splashAthCol: {
    alignItems: 'center',
  },
  splashAthLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  splashAthLabel: {
    color: '#64748b',
    fontSize: 7,
    marginTop: 2,
    fontWeight: '700',
  },
  splashSchoolName: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  splashLicenseLine: {
    color: '#22c55e',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 3,
    fontWeight: '600',
  },
  splashDivider: {
    height: 1,
    backgroundColor: '#1e3a5f',
  },
  splashProgSection: {
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 8,
  },
  splashBarTrough: {
    height: 10,
    backgroundColor: '#1a2332',   // PC: troughcolor
    borderRadius: 0,
    overflow: 'hidden',
  },
  splashBarFill: {
    height: 10,
    backgroundColor: '#3949ab',   // PC: background color of bar
  },
  splashPct: {
    color: '#7986cb',             // PC: pct_var label fg
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 3,
  },
  splashStatus: {
    color: '#94a3b8',             // PC: status_var label fg
    fontSize: 10,
    marginTop: 4,
  },
  splashDots: {
    color: '#3949ab',             // PC: dots_var label fg
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 2,
  },
  splashBottomDivider: {
    height: 1,
    backgroundColor: '#1e3a5f',
    marginTop: 6,
  },
  splashBottom: {
    backgroundColor: '#0a1628',   // PC: bottom Frame bg
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  splashCopyright: {
    color: '#334155',             // PC: copyright label fg
    fontSize: 8,
  },

  // ── Main shell ───────────────────────────────────────────────────────────
  shell: { flex: 1 },
  headerDivider: { height: 3, backgroundColor: C.primary },
  tabContent: { flex: 1 },
});
