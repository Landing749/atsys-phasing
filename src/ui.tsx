/**
 * ui.tsx — Shared UI primitives.
 * All colours match MODERN_COLORS from the PC app exactly.
 * AppHeader now uses actual school logo + ATH Studios logo (via Image).
 */
import React from 'react';
import {
  ActivityIndicator, Image, StyleSheet, Text,
  TouchableOpacity, View, ViewStyle, TextStyle,
} from 'react-native';
import { C } from './constants';

// ── Image assets (same files as splash) ──────────────────────────────────────
const SCHOOL_LOGO = require('../assets/school_logo.png');
const ATH_LOGO    = require('../assets/athstudios_logo.png');

// ─── Card (mirrors PC's make_card helper) ────────────────────────────────────
export function Card({ title, hdrColor = C.primary, children, style }: {
  title: string; hdrColor?: string; children: React.ReactNode; style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.cardHdr, { backgroundColor: hdrColor }]}>
        <Text style={styles.cardHdrText}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

// ─── PC-style counter card (PRESENT / ABSENT / TOTAL) ────────────────────────
export function CounterCard({ icon, label, value, color }: {
  icon: string; label: string; value: string | number; color: string;
}) {
  return (
    <View style={[styles.counterCard, { backgroundColor: color }]}>
      <Text style={styles.counterLabel}>{icon} {label}</Text>
      <Text style={styles.counterValue}>{value}</Text>
    </View>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
export function Btn({ label, onPress, disabled, loading, color = C.primary, style, textStyle }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
  color?: string; style?: ViewStyle; textStyle?: TextStyle;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: disabled ? C.bg_hover : color }, style]}
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.78}
    >
      {loading
        ? <ActivityIndicator color={C.text_primary} size="small" />
        : <Text style={[styles.btnText, textStyle]}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ─── Section label (VISUAL ANALYTICS, QUICK ACTIONS etc.) ────────────────────
export function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

// ─── Status row (icon + label + value) ───────────────────────────────────────
export function StatusRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusIcon}>{icon}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

// ─── KPI pill (from PC's _kpi helper in stats tab) ───────────────────────────
export function KpiPill({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <View style={[styles.kpiPill, { backgroundColor: color }]}>
      <Text style={styles.kpiLabel}>{icon} {label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

// ─── Day-of-week pill (from PC's dow_row) ────────────────────────────────────
export function DowPill({ day, absent, total }: { day: string; absent: number; total: number }) {
  const color = absent > 0 ? C.error : C.success;
  return (
    <View style={[styles.dowPill, { backgroundColor: color }]}>
      <Text style={styles.dowDay}>{day}</Text>
      <Text style={styles.dowCount}>{absent}/{total}</Text>
    </View>
  );
}

// ─── Risk header (from PC's risk_hdr) ────────────────────────────────────────
export function RiskBanner({ icon, level, color }: { icon: string; level: string; color: string }) {
  return (
    <View style={[styles.riskHdr, { backgroundColor: color }]}>
      <Text style={styles.riskHdrText}>{icon}  ATTENDANCE RISK LEVEL:  {level}</Text>
    </View>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
const TOAST_BG: Record<string, string> = { ok: C.success, warn: C.warning, error: C.error };
export function Toast({ text, kind }: { text: string; kind: 'ok' | 'warn' | 'error' }) {
  return (
    <View style={[styles.toast, { backgroundColor: TOAST_BG[kind] }]}>
      <Text style={styles.toastText}>{text}</Text>
    </View>
  );
}

// ─── Bottom tab bar — PC notebook style ──────────────────────────────────────
export function TabBar({ tabs, active, onSelect }: {
  tabs: readonly { key: string; icon: string; label: string }[];
  active: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.tabItem}
            onPress={() => onSelect(t.key)}
            activeOpacity={0.7}
          >
            {isActive && <View style={styles.tabActiveLine} />}
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{t.icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── App header — mirrors PC's header_frame (primary_dark, 90px) ─────────────
// Now uses actual school logo + ATH Studios logo, matching PC layout.
export function AppHeader({ fileLoaded, dateFound, statusText }: {
  fileLoaded: boolean; dateFound: string | null; statusText: string;
}) {
  return (
    <View style={styles.appHeader}>
      {/* School logo (60×60 in PC app) */}
      <Image source={SCHOOL_LOGO} style={styles.headerSchoolLogo} resizeMode="contain" />

      {/* App name + subtitle — centre section */}
      <View style={styles.headerCenter}>
        <Text style={styles.appTitle}>ATSYS</Text>
        <Text style={styles.schoolName}>Dr. Alfredo Pio De Roda ES</Text>
        <Text style={styles.appSubtitle}>Attendance Tracking System</Text>
      </View>

      {/* Vertical divider */}
      <View style={styles.headerVDivider} />

      {/* Status section — right side */}
      <View style={styles.headerStatus}>
        <Text style={[styles.systemReady, { color: fileLoaded ? C.success : C.warning }]}>
          {fileLoaded ? '🟢 SYSTEM READY' : '🟡 LOADING…'}
        </Text>
        {dateFound && <Text style={styles.headerDate}>{dateFound}</Text>}
        <Text style={styles.headerStatusText} numberOfLines={1}>{statusText}</Text>
        {/* ATH Studios branding — small, right-aligned, matches PC header */}
        <View style={styles.athBrandRow}>
          <Image source={ATH_LOGO} style={styles.headerAthLogo} resizeMode="contain" />
          <Text style={styles.athBrandText}>ATH Studios</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Page header (tab-level, matches PC's hdr frames) ────────────────────────
export function PageHdr({ text, color = C.primary }: { text: string; color?: string }) {
  return (
    <View style={[styles.pageHdr, { backgroundColor: color }]}>
      <Text style={styles.pageHdrText}>{text}</Text>
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: { backgroundColor: C.bg_card, borderRadius: 0, marginBottom: 10, overflow: 'hidden' },
  cardHdr: { paddingHorizontal: 15, paddingVertical: 10 },
  cardHdrText: { color: C.text_primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { padding: 14 },

  counterCard: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  counterLabel: { color: C.text_primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  counterValue: { color: C.text_primary, fontSize: 22, fontWeight: '900' },

  btn: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
  btnText: { color: C.text_primary, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  sectionLabel: { color: C.text_secondary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },

  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  statusIcon: { fontSize: 14, width: 22, marginRight: 6 },
  statusLabel: { flex: 1, color: C.text_secondary, fontSize: 12 },
  statusValue: { color: C.text_primary, fontSize: 12, fontWeight: '700' },

  kpiPill: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  kpiLabel: { color: '#fff', fontSize: 9, fontWeight: '700', marginBottom: 2 },
  kpiValue: { color: '#fff', fontSize: 16, fontWeight: '900' },

  dowPill: { paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 4, alignItems: 'center' },
  dowDay: { color: '#fff', fontSize: 9, fontWeight: '700' },
  dowCount: { color: '#fff', fontSize: 12, fontWeight: '900' },

  riskHdr: { paddingHorizontal: 12, paddingVertical: 7 },
  riskHdrText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  toast: {
    position: 'absolute', top: 10, left: 12, right: 12,
    paddingVertical: 10, paddingHorizontal: 16,
    zIndex: 100, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.bg_card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8, position: 'relative', paddingTop: 4 },
  tabActiveLine: {
    position: 'absolute', top: 0, left: '10%', right: '10%',
    height: 2, backgroundColor: C.primary_accent,
  },
  tabIcon: { fontSize: 16, opacity: 0.4, marginBottom: 1 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 8, fontWeight: '800', color: C.text_secondary, letterSpacing: 0.4 },
  tabLabelActive: { color: '#fff' },

  // App header
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary_dark,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 72,
  },
  headerSchoolLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 10,
  },
  headerCenter: {
    justifyContent: 'center',
    marginRight: 10,
  },
  appTitle: {
    color: C.text_primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  schoolName: {
    color: C.text_primary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  appSubtitle: {
    color: C.text_secondary,
    fontSize: 8,
    marginTop: 1,
  },
  headerVDivider: {
    width: 2,
    height: 36,
    backgroundColor: C.primary_accent,
    marginRight: 10,
  },
  headerStatus: {
    flex: 1,
    alignItems: 'flex-end',
  },
  systemReady: { fontSize: 9, fontWeight: '800' },
  headerDate: { color: C.info, fontSize: 9, marginTop: 2 },
  headerStatusText: { color: C.text_secondary, fontSize: 9, maxWidth: 110, textAlign: 'right' },
  athBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerAthLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  athBrandText: {
    color: '#64748b',
    fontSize: 7,
    fontWeight: '700',
  },

  pageHdr: { paddingHorizontal: 15, paddingVertical: 12 },
  pageHdrText: { color: C.text_primary, fontSize: 14, fontWeight: '800' },

  divider: { height: 1, backgroundColor: C.divider, marginVertical: 8 },
});
