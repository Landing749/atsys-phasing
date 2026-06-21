import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { C } from '../constants';
import { Btn, CounterCard, SectionLabel, Card, StatusRow } from '../ui';
import { ParsedSf2, Student, ScanEntry } from '../types';

interface Props {
  parsed: ParsedSf2;
  students: Student[];
  scanJournal: ScanEntry[];
  onLoadNewFile: () => void;
  onGoToTab: (t: string) => void;
}

export default function DashboardTab({ parsed, students, scanJournal, onLoadNewFile, onGoToTab }: Props) {
  const present = students.filter(s => s.alreadyPresent).length;
  const absent  = students.length - present;
  const pct     = students.length > 0 ? Math.round(present / students.length * 100) : 0;

  const qrCount    = scanJournal.filter(e => e.source === 'qr').length;
  const manCount   = scanJournal.filter(e => e.source === 'manual').length;
  const unmarkCount = scanJournal.filter(e => e.action === 'unmark').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg_main }} contentContainerStyle={s.body}>
      {/* Title — mirrors PC's "📊 ATTENDANCE DASHBOARD" label */}
      <Text style={s.dashTitle}>📊 ATTENDANCE DASHBOARD</Text>

      {/* Stats Cards Row — exact mirror of PC's 4-card row */}
      <View style={s.statsRow}>
        <CounterCard icon="👥" label="TOTAL STUDENTS" value={students.length} color={C.primary} />
        <CounterCard icon="✅" label="PRESENT"        value={present}          color={C.success} />
        <CounterCard icon="❌" label="ABSENT"         value={absent}           color={C.error} />
        <CounterCard icon="📊" label="PERCENTAGE"     value={`${pct}%`}        color={C.info} />
      </View>

      {/* Visual Analytics — mirrors PC chart section (no matplotlib on mobile; use bar) */}
      <SectionLabel text="📈 VISUAL ANALYTICS" />
      <View style={s.chartCard}>
        {students.length === 0 ? (
          <View style={s.chartPlaceholder}>
            <Text style={s.chartPlaceholderText}>📊 Load an Excel file to see attendance charts{'\n\n'}Charts will display automatically</Text>
          </View>
        ) : (
          <>
            {/* Attendance rate bar — mirrors PC's bar chart */}
            <Text style={s.chartLabel}>Attendance Rate — {pct}%</Text>
            <View style={s.barOuter}>
              <View style={[s.barInner, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? C.success : pct >= 70 ? C.warning : C.error }]} />
              <View style={[s.barRemainder, { width: `${100 - pct}%` as any }]} />
            </View>
            <View style={s.barLegendRow}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.success }]} /><Text style={s.legendText}>Present ({present})</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.error }]} /><Text style={s.legendText}>Absent ({absent})</Text></View>
            </View>

            {/* Session breakdown */}
            <View style={s.sessionRow}>
              <View style={[s.sessionPill, { backgroundColor: C.info }]}>
                <Text style={s.sessionPillLabel}>📷 QR Scans</Text>
                <Text style={s.sessionPillVal}>{qrCount}</Text>
              </View>
              <View style={[s.sessionPill, { backgroundColor: C.primary_accent }]}>
                <Text style={s.sessionPillLabel}>✍️ Manual</Text>
                <Text style={s.sessionPillVal}>{manCount}</Text>
              </View>
              <View style={[s.sessionPill, { backgroundColor: C.warning }]}>
                <Text style={s.sessionPillLabel}>↩️ Unmarked</Text>
                <Text style={s.sessionPillVal}>{unmarkCount}</Text>
              </View>
            </View>

            {/* Recent scans (last 5) */}
            {scanJournal.length > 0 && (
              <>
                <Text style={s.recentLabel}>Recent scans (last 5)</Text>
                {scanJournal.slice(-5).reverse().map((e, i) => (
                  <View key={i} style={s.recentRow}>
                    <Text style={[s.recentAction, { color: e.action === 'mark' ? C.success : C.warning }]}>
                      {e.action === 'mark' ? '✓' : '↩'}
                    </Text>
                    <Text style={s.recentName} numberOfLines={1}>{e.name}</Text>
                    <Text style={s.recentMeta}>{e.source}  {e.timestamp.slice(11, 19)}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>

      {/* File info */}
      <Card title="📄 LOADED FILE" hdrColor={C.info} style={{ marginBottom: 10 }}>
        <StatusRow icon="📋" label="File" value={parsed.fileName} />
        <StatusRow icon="📅" label="Date" value={parsed.dateFound ?? 'Not found'} valueColor={parsed.dateFound ? C.success : C.error} />
        <StatusRow icon="👥" label="Students" value={String(students.length)} />
      </Card>

      {/* Quick Actions — mirrors PC's QUICK ACTIONS row of buttons */}
      <SectionLabel text="⚡ QUICK ACTIONS" />
      <View style={s.actionGrid}>
        <Btn label="📷  START SCANNING" onPress={() => onGoToTab('scan')}     color={C.success}         style={s.actionBtn} />
        <Btn label="✍️  MANUAL MARK"    onPress={() => onGoToTab('manual')}   color={C.primary_accent}  style={s.actionBtn} />
        <Btn label="🔲  QR CODES"       onPress={() => onGoToTab('qr')}       color={C.primary}         style={s.actionBtn} />
        <Btn label="📈  STUDENT STATS"  onPress={() => onGoToTab('stats')}    color={C.info}            style={s.actionBtn} />
        <Btn label="📂  LOAD NEW FILE"  onPress={onLoadNewFile}               color={C.bg_hover}        style={s.actionBtn} />
        <Btn label="⚙️  SETTINGS"       onPress={() => onGoToTab('settings')} color={C.primary}         style={s.actionBtn} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { padding: 14, paddingBottom: 30 },
  dashTitle: { color: C.primary, fontSize: 16, fontWeight: '800', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  chartCard: { backgroundColor: C.bg_card, padding: 14, marginBottom: 16 },
  chartPlaceholder: { alignItems: 'center', paddingVertical: 40 },
  chartPlaceholderText: { color: C.text_secondary, fontSize: 12, textAlign: 'center', lineHeight: 20 },
  chartLabel: { color: C.text_secondary, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  barOuter: { flexDirection: 'row', height: 18, marginBottom: 8, backgroundColor: C.bg_hover, overflow: 'hidden' },
  barInner: { height: '100%' },
  barRemainder: { height: '100%', backgroundColor: C.error },
  barLegendRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: C.text_secondary, fontSize: 11 },
  sessionRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sessionPill: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  sessionPillLabel: { color: '#fff', fontSize: 9, fontWeight: '700' },
  sessionPillVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  recentLabel: { color: C.text_secondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 8 },
  recentAction: { fontSize: 14, fontWeight: '800', width: 16 },
  recentName: { flex: 1, color: C.text_primary, fontSize: 12 },
  recentMeta: { color: C.text_secondary, fontSize: 10 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { minWidth: '47%', flex: 1 },
});
