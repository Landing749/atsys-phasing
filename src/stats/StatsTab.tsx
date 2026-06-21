/**
 * StatsTab.tsx
 * Mirrors PC's setup_stats_tab() + _stats_lookup() exactly:
 *  - Fuzzy name search (substring → token → difflib ratio ≥ 0.55)
 *  - KPI pills: Days Tracked, Present%, Absent%, Most Absent Day
 *  - Attendance bar
 *  - Day-of-week breakdown pills
 *  - Absent dates list
 *  - Risk Calculator (CRITICAL / HIGH / MEDIUM / LOW)
 *  - Best-case / worst-case projections
 *  - Recommendation text
 */
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C, ATTENDANCE_THRESHOLD } from '../constants';
import { PageHdr, KpiPill, DowPill, RiskBanner, Btn, Divider } from '../ui';
import { getSheet } from '../sf2/sf2';
import * as XLSX from 'xlsx';
import { ParsedSf2 } from '../types';

interface Props { parsed: ParsedSf2; }

// ── Fuzzy match — mirrors PC's difflib SequenceMatcher ───────────────────────
function sequenceRatio(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  const matches = new Set<string>();
  for (let i = 0; i < la; i++) {
    const sub = a.slice(i, i + 3);
    if (b.includes(sub)) { for (const c of sub) matches.add(c + i); }
  }
  return (2 * matches.size) / (la + lb);
}

const DAY_FULL: Record<string, string> = {
  M: 'Monday', T: 'Tuesday', W: 'Wednesday', Th: 'Thursday',
  F: 'Friday', S: 'Saturday', Su: 'Sunday',
};

export default function StatsTab({ parsed }: Props) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<JSX.Element[]>([]);
  const [searched, setSearched] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  function clear() { setQuery(''); setResults([]); setSearched(false); }

  function search() {
    const q = query.trim().toLowerCase();
    if (!q) return;

    const sheet = getSheet();
    if (!sheet) {
      setResults([<View key="err" style={s.errBox}><Text style={s.errText}>⚠️  No SF2 file loaded. Open the Scan tab first.</Text></View>]);
      setSearched(true); return;
    }

    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
    const today = new Date().getDate();

    // Discover date columns (mirrors PC: row 11 = day numbers, row 12 = day letters)
    const dateCols: { c: number; num: number; letter: string }[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 10, c })]; // row 11, 0-indexed
      if (!cell) continue;
      const n = parseInt(String(cell.v), 10);
      if (isNaN(n) || n > today) continue;
      const lCell = sheet[XLSX.utils.encode_cell({ r: 11, c })];
      dateCols.push({ c, num: n, letter: String(lCell?.v ?? '').trim() });
    }
    const totalDays = dateCols.length;

    // All students (mirrors PC: row 13+, col B)
    const all: { row: number; name: string }[] = [];
    for (let r = 12; r <= range.e.r; r++) { // row 13 = index 12
      const cell = sheet[XLSX.utils.encode_cell({ r, c: 1 })]; // col B = index 1
      const name = String(cell?.v ?? '').trim();
      if (!name || name.length < 2) continue;
      all.push({ row: r + 1, name });
    }

    // Fuzzy match — mirrors PC's logic
    const matches: { row: number; name: string; score: number }[] = [];
    for (const { row, name } of all) {
      const nl = name.toLowerCase();
      if (nl.includes(q)) { matches.push({ row, name, score: 1.0 }); continue; }
      if (q.split(' ').every(tok => nl.includes(tok))) { matches.push({ row, name, score: 0.95 }); continue; }
      const ratio = sequenceRatio(q, nl);
      if (ratio >= 0.55) matches.push({ row, name, score: ratio });
    }
    matches.sort((a, b) => b.score - a.score);
    const top = matches.slice(0, 8);

    if (!top.length) {
      setResults([<View key="none" style={s.noMatch}><Text style={s.noMatchText}>❌  No student found matching "{query.trim()}".{'\n'}Try a shorter name or just their surname.</Text></View>]);
      setSearched(true); return;
    }

    // Build cards
    const cards = top.map(({ row, name }) => {
      const absentDates: { num: number; letter: string }[] = [];
      const presentDates: { num: number; letter: string }[] = [];
      const dayAbsent: Record<string, number> = {};
      const dayTotal:  Record<string, number> = {};

      for (const { c, num, letter } of dateCols) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row - 1, c })];
        const present = cell && ['✓', '1', 'P', 'p'].includes(String(cell.v).trim());
        const dl = letter || '?';
        dayTotal[dl]  = (dayTotal[dl]  ?? 0) + 1;
        if (present) { presentDates.push({ num, letter: dl }); }
        else         { absentDates.push({ num, letter: dl }); dayAbsent[dl] = (dayAbsent[dl] ?? 0) + 1; }
      }

      const presentCount = presentDates.length;
      const absentCount  = absentDates.length;
      const tracked      = presentCount + absentCount;
      const pctPresent   = tracked ? (presentCount / tracked * 100) : 0;
      const pctAbsent    = tracked ? (absentCount  / tracked * 100) : 0;
      const mostAbsentDay = Object.keys(dayAbsent).sort((a, b) => dayAbsent[b] - dayAbsent[a])[0];

      // Consecutive absences at end of timeline (same as PC)
      const timeline: boolean[] = [];
      for (const { c } of dateCols) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row - 1, c })];
        timeline.push(!!(cell && ['✓', '1', 'P', 'p'].includes(String(cell.v).trim())));
      }
      let consecAbsent = 0;
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (!timeline[i]) consecAbsent++; else break;
      }

      // Projections (mirrors PC's risk calculator)
      const today2 = new Date();
      const weekdaysLeft = Array.from({ length: 30 - today2.getDate() }, (_, i) => i + today2.getDate() + 1)
        .filter(d => { try { return new Date(today2.getFullYear(), today2.getMonth(), d).getDay() % 6 !== 0; } catch { return false; } }).length;
      const projBest  = tracked + weekdaysLeft > 0 ? ((presentCount + weekdaysLeft) / (tracked + weekdaysLeft) * 100) : 0;
      const projWorst = tracked + weekdaysLeft > 0 ? (presentCount / (tracked + weekdaysLeft) * 100) : 0;

      // Risk level (mirrors PC exactly)
      let riskLevel: string, riskColor: string, riskIcon: string, riskMsg: string;
      if (pctPresent < 70)      { riskLevel = 'CRITICAL'; riskColor = '#b71c1c'; riskIcon = '🔴'; riskMsg = 'Below minimum threshold. Immediate intervention required.'; }
      else if (pctPresent < 80) { riskLevel = 'HIGH';     riskColor = C.error;   riskIcon = '🟠'; riskMsg = 'Below 80%. Risk of failing attendance requirements.'; }
      else if (pctPresent < 90) { riskLevel = 'MEDIUM';   riskColor = C.warning; riskIcon = '🟡'; riskMsg = 'Acceptable but could improve. Monitor for further absences.'; }
      else                      { riskLevel = 'LOW';      riskColor = C.success; riskIcon = '🟢'; riskMsg = 'Excellent attendance. Keep it up!'; }
      if (consecAbsent >= 3 && (riskLevel === 'LOW' || riskLevel === 'MEDIUM')) {
        riskLevel = 'HIGH'; riskColor = C.error; riskIcon = '🟠';
        riskMsg = `⚠️  ${consecAbsent} consecutive absences detected.`;
      }

      // Recommendation (mirrors PC)
      let recText: string, recColor: string;
      if (projBest < ATTENDANCE_THRESHOLD) {
        recText  = `❌  Even perfect attendance can't reach ${ATTENDANCE_THRESHOLD}% this month. Escalate immediately.`;
        recColor = '#b71c1c';
      } else if (pctPresent < ATTENDANCE_THRESHOLD) {
        const xNeeded = Math.max(0, Math.ceil((ATTENDANCE_THRESHOLD / 100) * (tracked + weekdaysLeft) - presentCount));
        recText  = `⚠️  Must attend at least ${xNeeded} of ${weekdaysLeft} remaining school days to reach ${ATTENDANCE_THRESHOLD}%.`;
        recColor = C.warning;
      } else {
        const maxMiss = Math.max(0, Math.floor((presentCount / (ATTENDANCE_THRESHOLD / 100)) - tracked));
        recText  = `✅  On track. Can afford at most ${Math.min(maxMiss, weekdaysLeft)} more absence(s) and stay above ${ATTENDANCE_THRESHOLD}%.`;
        recColor = C.success;
      }

      return (
        <View key={row} style={s.card}>
          {/* Card header */}
          <View style={[s.cardHdr, { backgroundColor: C.primary }]}>
            <Text style={s.cardHdrText}>👤  {name}</Text>
          </View>
          <View style={s.cardBody}>
            {/* KPI pills */}
            <View style={s.kpiRow}>
              <KpiPill icon="📅" label="Days Tracked" value={String(tracked)}                                       color={C.info} />
              <KpiPill icon="✅" label="Present"      value={`${presentCount}  (${pctPresent.toFixed(1)}%)`}        color={C.success} />
              <KpiPill icon="❌" label="Absent"       value={`${absentCount}  (${pctAbsent.toFixed(1)}%)`}          color={absentCount > 0 ? C.error : C.bg_hover} />
              {mostAbsentDay && <KpiPill icon="⚠️" label="Most Absent Day" value={DAY_FULL[mostAbsentDay] ?? mostAbsentDay} color={C.warning} />}
            </View>

            {/* Attendance bar */}
            {tracked > 0 && (
              <View style={s.barOuter}>
                <View style={[s.barInner, { flexGrow: pctPresent / 100, backgroundColor: C.success }]} />
                <View style={[s.barInner, { flexGrow: pctAbsent / 100, backgroundColor: C.error }]} />
              </View>
            )}

            {/* Day-of-week breakdown */}
            {Object.keys(dayAbsent).length > 0 && (
              <>
                <Text style={s.secLabel}>Absences by Day of Week:</Text>
                <View style={s.dowRow}>
                  {Object.entries(dayTotal).sort().map(([dl, tot]) => (
                    <DowPill key={dl} day={DAY_FULL[dl] ?? dl} absent={dayAbsent[dl] ?? 0} total={tot} />
                  ))}
                </View>
              </>
            )}

            {/* Absent dates */}
            {absentDates.length > 0 ? (
              <>
                <Text style={s.secLabel}>Absent on these dates:</Text>
                <Text style={s.absentDates}>{absentDates.map(({ num, letter }) => `Day ${num} (${letter})`).join('  •  ')}</Text>
              </>
            ) : (
              <Text style={s.perfectAtt}>🎉  Perfect attendance — no absences recorded!</Text>
            )}

            <Divider />

            {/* Risk */}
            <RiskBanner icon={riskIcon} level={riskLevel} color={riskColor} />
            <View style={[s.riskBody, { backgroundColor: C.bg_hover }]}>
              <Text style={s.riskMsg}>{riskMsg}</Text>
              <View style={s.projRow}>
                <KpiPill icon="📊" label="Current Rate"         value={`${pctPresent.toFixed(1)}%`} color={riskColor} />
                <KpiPill icon="🎯" label="Min. Required"        value={`${ATTENDANCE_THRESHOLD}%`}  color={C.info} />
                <KpiPill icon="📈" label="Best-Case"            value={`${projBest.toFixed(1)}%`}   color={projBest  >= ATTENDANCE_THRESHOLD ? C.success : C.error} />
                <KpiPill icon="📉" label="Worst-Case"           value={`${projWorst.toFixed(1)}%`}  color={projWorst >= ATTENDANCE_THRESHOLD ? C.success : C.error} />
                {consecAbsent > 0 && <KpiPill icon="⛓️" label="Consec. Absent" value={String(consecAbsent)} color={consecAbsent >= 3 ? C.error : C.warning} />}
              </View>
              <View style={[s.recBox, { backgroundColor: recColor }]}>
                <Text style={s.recText}>{recText}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    });

    setResults(cards); setSearched(true);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 300, animated: true }), 200);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg_main }}>
      <PageHdr text="📈  STUDENT STATISTICS" />
      <ScrollView ref={scrollRef} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {/* Search card — mirrors PC exactly */}
        <View style={s.searchCard}>
          <Text style={s.searchHint}>🔍  Enter student name  (doesn't have to be exact):</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.input} placeholder="e.g. juan, dela cruz, santos"
              placeholderTextColor={C.border} value={query} onChangeText={setQuery}
              onSubmitEditing={search} returnKeyType="search"
            />
            <TouchableOpacity style={s.searchBtn} onPress={search}><Text style={s.searchBtnText}>  Search  </Text></TouchableOpacity>
            <TouchableOpacity style={s.clearBtn}  onPress={clear}><Text style={s.clearBtnText}>✕</Text></TouchableOpacity>
          </View>
          <Text style={s.hint}>Tip: partial names work — e.g. 'juan', 'dela cruz', 'santos'</Text>
        </View>

        {searched && results}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  body: { padding: 14, paddingBottom: 40 },
  searchCard: { backgroundColor: C.bg_card, padding: 14, marginBottom: 14 },
  searchHint: { color: C.text_primary, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  input: { flex: 1, backgroundColor: C.bg_hover, color: C.text_primary, fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 0 },
  searchBtn: { backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 10 },
  searchBtnText: { color: C.text_primary, fontSize: 12, fontWeight: '800' },
  clearBtn: { backgroundColor: C.error, paddingHorizontal: 12, paddingVertical: 10 },
  clearBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  hint: { color: C.text_secondary, fontSize: 11, fontStyle: 'italic' },

  errBox: { backgroundColor: C.error, padding: 14, marginBottom: 10 },
  errText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  noMatch: { backgroundColor: C.bg_card, padding: 14 },
  noMatchText: { color: C.error, fontSize: 13, lineHeight: 20 },

  card: { backgroundColor: C.bg_card, marginBottom: 16, borderWidth: 1, borderColor: C.primary_accent },
  cardHdr: { paddingHorizontal: 14, paddingVertical: 11 },
  cardHdrText: { color: C.text_primary, fontSize: 14, fontWeight: '800' },
  cardBody: { padding: 14 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  barOuter: { flexDirection: 'row', height: 16, marginBottom: 10, overflow: 'hidden' },
  barInner: { height: '100%' },

  secLabel: { color: C.text_secondary, fontSize: 10, fontWeight: '800', marginBottom: 6, marginTop: 4 },
  dowRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  absentDates: { color: C.error, fontSize: 11, lineHeight: 18, marginBottom: 6 },
  perfectAtt: { color: C.success, fontSize: 13, fontWeight: '800', marginVertical: 6 },

  riskBody: { padding: 12 },
  riskMsg: { color: C.text_primary, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  projRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  recBox: { padding: 10 },
  recText: { color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 18 },
});
