import React, { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../constants';
import { Toast, CounterCard } from '../ui';
import { markPresentAndSave, unmarkAndSave } from '../sf2/sf2';
import { ParsedSf2, Student, ScanEntry } from '../types';

interface Props {
  parsed: ParsedSf2; students: Student[];
  onStudentsChange: (s: Student[]) => void;
  onAddJournal: (e: ScanEntry) => void;
}

export default function ManualTab({ parsed, students, onStudentsChange, onAddJournal }: Props) {
  const [search, setSearch] = useState('');
  const [toast, setToast]   = useState<{ text: string; kind: 'ok' | 'warn' | 'error' } | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const col     = parsed.currentColumn as number;
  const present = students.filter(s => s.alreadyPresent).length;
  const absent  = students.length - present;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter(s => s.name.toLowerCase().includes(q) || s.number.includes(q)) : students;
  }, [students, search]);

  function showToast(text: string, kind: 'ok' | 'warn' | 'error') {
    setToast({ text, kind });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2000);
  }

  function tap(st: Student) {
    if (st.alreadyPresent) {
      unmarkAndSave(st.row, col);
      onStudentsChange(students.map(s => s.row === st.row ? { ...s, alreadyPresent: false } : s));
      showToast(`↩  Unmarked: ${st.name}`, 'warn');
      onAddJournal({ name: st.name, timestamp: new Date().toISOString(), source: 'manual', action: 'unmark' });
    } else {
      markPresentAndSave(st.row, col);
      onStudentsChange(students.map(s => s.row === st.row ? { ...s, alreadyPresent: true } : s));
      showToast(`✓  Marked: ${st.name}`, 'ok');
      onAddJournal({ name: st.name, timestamp: new Date().toISOString(), source: 'manual', action: 'mark' });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg_main }}>
      {/* Header — mirrors PC: "✍️  MANUAL ATTENDANCE" */}
      <View style={s.hdr}><Text style={s.hdrText}>✍️  MANUAL ATTENDANCE</Text></View>

      {/* Search bar — mirrors PC's search_card */}
      <View style={s.searchCard}>
        <View style={s.searchRow}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput style={s.searchInput} placeholder="Search student name or number…" placeholderTextColor={C.border}
            value={search} onChangeText={setSearch} clearButtonMode="while-editing" />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
              <Text style={s.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Counters — mirrors PC's counter_frame */}
      <View style={s.countersRow}>
        <CounterCard icon="✅" label="PRESENT" value={present}          color={C.success} />
        <CounterCard icon="❌" label="ABSENT"  value={absent}           color={C.error} />
        <CounterCard icon="👥" label="TOTAL"   value={students.length}  color={C.primary} />
      </View>

      {/* Roster header — mirrors PC's roster_hdr */}
      <View style={s.rosterHdr}>
        <Text style={[s.rosterHdrTxt, { width: 28 }]}>#</Text>
        <Text style={[s.rosterHdrTxt, { flex: 1 }]}>STUDENT NAME</Text>
        <Text style={[s.rosterHdrTxt, { width: 70, textAlign: 'center' }]}>STATUS</Text>
        <Text style={[s.rosterHdrTxt, { width: 76, textAlign: 'center' }]}>ACTION</Text>
      </View>

      <View style={{ flex: 1, position: 'relative' }}>
        <FlatList
          data={filtered} keyExtractor={s => String(s.row)}
          renderItem={({ item, index }) => <Row item={item} index={index} onTap={tap} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No students match "{search}"</Text></View>}
        />
        {toast && <Toast text={toast.text} kind={toast.kind} />}
      </View>
    </View>
  );
}

function Row({ item, index, onTap }: { item: Student; index: number; onTap: (s: Student) => void }) {
  return (
    <TouchableOpacity style={[s.row, item.alreadyPresent && s.rowPresent]} onPress={() => onTap(item)} activeOpacity={0.7}>
      <Text style={s.rowNum}>{index + 1}</Text>
      <View style={s.nameCol}>
        <View style={[s.dot, { backgroundColor: item.alreadyPresent ? C.success : C.border }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
          {item.number ? <Text style={s.rowNum2}>{item.number}</Text> : null}
        </View>
      </View>
      <View style={[s.statusBadge, { backgroundColor: item.alreadyPresent ? C.success + '33' : C.bg_hover }]}>
        <Text style={[s.statusBadgeText, { color: item.alreadyPresent ? C.success : C.text_secondary }]}>
          {item.alreadyPresent ? '✓ PRESENT' : '— ABSENT'}
        </Text>
      </View>
      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: item.alreadyPresent ? C.error : C.primary }]}
        onPress={() => onTap(item)}
      >
        <Text style={s.actionBtnText}>{item.alreadyPresent ? 'UNMARK' : 'MARK ✓'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  hdr: { backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 12 },
  hdrText: { color: C.text_primary, fontSize: 14, fontWeight: '800' },
  searchCard: { backgroundColor: C.bg_card, paddingHorizontal: 14, paddingVertical: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg_hover, paddingHorizontal: 10 },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: C.text_primary, fontSize: 13, paddingVertical: 10 },
  clearBtn: { paddingHorizontal: 8 },
  clearBtnText: { color: C.error, fontWeight: '800', fontSize: 14 },
  countersRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
  rosterHdr: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary_dark, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border },
  rosterHdrTxt: { color: C.text_secondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider, backgroundColor: C.bg_main },
  rowPresent: { backgroundColor: '#0a1f0a' },
  rowNum: { color: C.text_secondary, fontSize: 11, width: 28 },
  nameCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowName: { color: C.text_primary, fontSize: 13, fontWeight: '600' },
  rowNum2: { color: C.text_secondary, fontSize: 10 },
  statusBadge: { width: 70, alignItems: 'center', paddingVertical: 4, marginRight: 4 },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
  actionBtn: { width: 68, paddingVertical: 7, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: C.text_secondary, fontSize: 13 },
});
