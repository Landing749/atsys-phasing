import React, { useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../constants';
import { PageHdr, Card, StatusRow } from '../ui';
import { ParsedSf2, Student } from '../types';

let QRCode: React.ComponentType<{ value: string; size: number; color: string; backgroundColor: string }> | null = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch { QRCode = null; }

interface Props { parsed: ParsedSf2; students: Student[]; }

export default function QrTab({ parsed, students }: Props) {
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<Student | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter(s => s.name.toLowerCase().includes(q)) : students;
  }, [students, search]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg_main }}>
      <View style={s.titleBar}>
        <Text style={s.titleText}>🔲  QR CODE GENERATOR</Text>
        <Text style={s.titleSub}>Reads student names directly from your loaded Excel file.</Text>
      </View>

      {!QRCode && (
        <View style={s.libWarn}>
          <Text style={s.libWarnText}>⚠️  react-native-qrcode-svg not installed.{'\n'}Run:  npm install react-native-qrcode-svg react-native-svg{'\n'}Then rebuild the app.</Text>
        </View>
      )}

      <Card title="📊  EXCEL SOURCE" hdrColor={C.info} style={{ margin: 10, marginBottom: 0 }}>
        <StatusRow icon="📋" label="Loaded file" value={parsed.fileName} valueColor={C.success} />
        <StatusRow icon="👥" label="Students found" value={`${students.length} students`} valueColor={students.length > 0 ? C.success : C.warning} />
      </Card>

      <View style={s.searchRow}>
        <TextInput style={s.searchInput} placeholder="Search student…" placeholderTextColor={C.border}
          value={search} onChangeText={setSearch} clearButtonMode="while-editing" />
      </View>

      <View style={s.listHdr}>
        <Text style={s.listHdrTxt}>👥  Students in the QR batch  ({filtered.length})</Text>
      </View>

      <FlatList
        data={filtered} numColumns={2} keyExtractor={s => String(s.row)}
        contentContainerStyle={s.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.qrCard} onPress={() => setSelected(item)} activeOpacity={0.75}>
            <View style={s.qrBox}>
              {QRCode
                ? <QRCode value={item.name} size={72} color={C.bg_main} backgroundColor="#fff" />
                : <Text style={s.qrPlaceholder}>🔲</Text>}
            </View>
            <Text style={s.qrName} numberOfLines={2}>{item.name}</Text>
            {item.number ? <Text style={s.qrNum}>{item.number}</Text> : null}
            <View style={[s.qrStatus, { backgroundColor: item.alreadyPresent ? C.success + '33' : C.bg_hover }]}>
              <Text style={[s.qrStatusText, { color: item.alreadyPresent ? C.success : C.text_secondary }]}>
                {item.alreadyPresent ? '✓ Present' : '— Absent'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No students match "{search}"</Text></View>}
      />

      {/* Full-screen QR modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHdr}>
              <Text style={s.modalHdrLabel}>STUDENT QR CODE</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={s.closeBtn}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selected && (
              <ScrollView contentContainerStyle={s.modalBody}>
                <Text style={s.modalName}>{selected.name}</Text>
                {selected.number ? <Text style={s.modalNum}>#{selected.number}</Text> : null}
                <View style={s.qrBigBox}>
                  {QRCode
                    ? <QRCode value={selected.name} size={210} color="#000" backgroundColor="#fff" />
                    : <View style={s.qrBigPlaceholder}><Text style={s.qrBigPlaceholderIcon}>🔲</Text><Text style={s.qrBigPlaceholderText}>Install react-native-qrcode-svg{'\n'}to display QR codes</Text></View>}
                </View>
                <View style={s.payloadBox}>
                  <Text style={s.payloadLabel}>QR PAYLOAD (exact student name from SF2)</Text>
                  <Text style={s.payloadValue}>{selected.name}</Text>
                </View>
                <Text style={s.modalNote}>This QR encodes the student's exact name as it appears in the SF2 file. The ATSYS scanner matches this value against the loaded roster.</Text>
                <View style={[s.modalStatus, { backgroundColor: selected.alreadyPresent ? C.success + '33' : C.error + '22' }]}>
                  <Text style={[s.modalStatusText, { color: selected.alreadyPresent ? C.success : C.error }]}>
                    {selected.alreadyPresent ? '✅  Present today' : '❌  Absent today'}
                  </Text>
                </View>
                <TouchableOpacity style={[s.closeFullBtn, { backgroundColor: C.primary }]} onPress={() => setSelected(null)}>
                  <Text style={s.closeFullBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  titleBar: { backgroundColor: C.primary_dark, paddingHorizontal: 14, paddingVertical: 12 },
  titleText: { color: C.text_primary, fontSize: 15, fontWeight: '800' },
  titleSub: { color: C.text_secondary, fontSize: 11, marginTop: 2 },
  libWarn: { backgroundColor: C.warning, padding: 12, margin: 10 },
  libWarnText: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  searchRow: { backgroundColor: C.bg_card, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { backgroundColor: C.bg_hover, color: C.text_primary, fontSize: 13, paddingHorizontal: 12, paddingVertical: 9 },
  listHdr: { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 7 },
  listHdrTxt: { color: C.text_primary, fontSize: 11, fontWeight: '800' },
  grid: { padding: 8, paddingBottom: 20 },
  qrCard: { flex: 1, margin: 5, backgroundColor: C.bg_card, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: C.border },
  qrBox: { marginBottom: 8 },
  qrPlaceholder: { fontSize: 52, width: 72, height: 72, textAlign: 'center', lineHeight: 72 },
  qrName: { color: C.text_primary, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  qrNum: { color: C.text_secondary, fontSize: 9, marginBottom: 4 },
  qrStatus: { paddingHorizontal: 8, paddingVertical: 3 },
  qrStatusText: { fontSize: 9, fontWeight: '800' },
  empty: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: C.text_secondary, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '92%', maxHeight: '90%', backgroundColor: C.bg_card, borderWidth: 1, borderColor: C.primary_accent, overflow: 'hidden' },
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 13 },
  modalHdrLabel: { color: C.primary_accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  closeBtn: { width: 30, height: 30, backgroundColor: C.bg_main, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: C.text_secondary, fontSize: 14, fontWeight: '700' },
  modalBody: { padding: 20, alignItems: 'center' },
  modalName: { color: C.text_primary, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  modalNum: { color: C.text_secondary, fontSize: 12, marginBottom: 16 },
  qrBigBox: { backgroundColor: '#fff', padding: 14, marginBottom: 16 },
  qrBigPlaceholder: { width: 210, height: 210, backgroundColor: C.bg_hover, alignItems: 'center', justifyContent: 'center', gap: 10 },
  qrBigPlaceholderIcon: { fontSize: 56 },
  qrBigPlaceholderText: { color: C.text_secondary, fontSize: 11, textAlign: 'center' },
  payloadBox: { backgroundColor: C.bg_main, padding: 12, marginBottom: 12, alignSelf: 'stretch' },
  payloadLabel: { color: C.text_secondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  payloadValue: { color: C.primary_accent, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  modalNote: { color: C.text_secondary, fontSize: 11, lineHeight: 17, textAlign: 'center', marginBottom: 12 },
  modalStatus: { paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
  modalStatusText: { fontSize: 13, fontWeight: '800' },
  closeFullBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  closeFullBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
