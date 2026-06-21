import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, SCHOOL_NAME } from '../constants';
import { Btn } from '../ui';

const EULA = `ATSYS Mobile — End User License Agreement

By continuing, you agree to the terms under which ATSYS is licensed for use at ${SCHOOL_NAME}.

GRANT OF LICENSE
A limited, non-exclusive, non-transferable, revocable license is granted to use ATSYS Mobile solely for authorized SF2 attendance management at the above institution.

PROHIBITED USE
You may not redistribute, reverse-engineer, sublicense, or use this software for purposes other than SF2 attendance management. License keys are hardware-locked to the first activating device.

DATA HANDLING
All attendance data is stored exclusively in the SF2 .xlsx file on your device. No student data is transmitted to any server. Only license validation data is sent to the ATSYS license server.

DISCLAIMER
This software is provided "as is." The full EULA shipped with the ATSYS PC installer (EULA.txt) governs all versions of this software including this mobile companion.`;

export default function EulaScreen({ onAccept }: { onAccept: () => void }) {
  const [accepted, setAccepted] = useState(false);
  return (
    <View style={s.root}>
      <View style={s.hdr}>
        <Text style={s.hdrLabel}>ATSYS MOBILE  •  v4.5.2</Text>
        <Text style={s.hdrTitle}>📋  End User License Agreement</Text>
        <Text style={s.hdrSub}>{SCHOOL_NAME}</Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
        <Text style={s.body}>{EULA}</Text>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.cbRow} onPress={() => setAccepted(v => !v)} activeOpacity={0.7}>
          <View style={[s.cb, accepted && s.cbOn]}>{accepted && <Text style={s.cbTick}>✓</Text>}</View>
          <Text style={s.cbLabel}>I have read and agree to the EULA</Text>
        </TouchableOpacity>
        <Btn label="Continue →" onPress={onAccept} disabled={!accepted} color={C.success} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg_main },
  hdr: { backgroundColor: C.primary_dark, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18 },
  hdrLabel: { color: C.primary_accent, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  hdrTitle: { color: C.text_primary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  hdrSub: { color: C.text_secondary, fontSize: 12 },
  scroll: { flex: 1, margin: 14 },
  scrollInner: { backgroundColor: C.bg_card, padding: 16 },
  body: { color: C.text_secondary, fontSize: 12, lineHeight: 20 },
  footer: { padding: 16, paddingBottom: 30, backgroundColor: C.bg_card, borderTopWidth: 1, borderTopColor: C.border },
  cbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cb: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: C.border, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  cbOn: { backgroundColor: C.success, borderColor: C.success },
  cbTick: { color: '#fff', fontWeight: '900', fontSize: 13 },
  cbLabel: { color: C.text_primary, fontSize: 14, flex: 1 },
});
