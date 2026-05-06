import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { RE_BROKERS } from '../constants/realestate';

const ACCENTS = [Colors.PRIMARY, Colors.SECONDARY, Colors.ACCENT, Colors.PINK];

export default function BrokersScreen() {
  const showCriteria = () => Alert.alert('קריטריונים למתווך מורשה', [
    '• ניסיון מוכח בנדל"ן בדובאי — מעל שנתיים',
    '• רישיון RERA תקף',
    '• דובר עברית או ניסיון עם ישראלים',
    '• ערוץ תקשורת מוסדר',
    '• הצגת חוזה מכר/השכרה שביצע',
    '• 2 ממליצים לפחות',
    '• הצגת תעודת זהות וקבלות מיסים',
  ].join('\n'));

  const recommendBroker = () => {
    Linking.openURL('https://wa.me/972502844867?text=' + encodeURIComponent('שלום, אני רוצה להמליץ על מתווך נדל"ן בדובאי. שם המתווך: '));
  };

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={{ fontSize: 22, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>🤝 מתווכים מומלצים</Text>
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity onPress={showCriteria} style={[s.actionBtn, s.actionBtnSecondary]}>
          <Text style={s.actionTxtSec}>✓ מה נדרש מהמתווך?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={recommendBroker} style={[s.actionBtn, s.actionBtnPrimary]}>
          <Text style={s.actionTxtPri}>+ המלץ על מתווך</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {RE_BROKERS.map((b, i) => {
          const c = ACCENTS[i % ACCENTS.length];
          return (
            <View key={b.id} style={[s.card, { borderColor: c + '40' }]}>
              <View style={s.cardHead}>
                <Image source={{ uri: b.image }} style={[s.avatar, { borderColor: c }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.brokerName}>{b.name}</Text>
                  <Text style={[s.brokerCo, { color: c }]}>{b.company}</Text>
                  <Text style={s.brokerYears}>⏱ {b.years} ניסיון</Text>
                </View>
                <View style={[s.verifiedBadge, { backgroundColor: c }]}>
                  <Text style={s.verifiedTxt}>✓ מאומת</Text>
                </View>
              </View>
              <View style={s.specBox}>
                <Text style={s.specRow}><Text style={{ fontWeight: '800' }}>התמחות: </Text>{b.specialty}</Text>
                <Text style={s.specRow}>🗣️ {b.langs.join(' · ')}</Text>
              </View>
              <View style={s.contactRow}>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${b.phone}`)} style={[s.contactBtn, { backgroundColor: Colors.SECONDARY }]}>
                  <Text style={s.contactTxt}>📞 חייג</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${b.whatsapp}`)} style={[s.contactBtn, { backgroundColor: '#25D366' }]}>
                  <Text style={s.contactTxt}>💬 וואטסאפ</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${b.email}`)} style={[s.contactBtn, { backgroundColor: Colors.PRIMARY }]}>
                  <Text style={s.contactTxt}>✉️ אימייל</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG },
  header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.PINK, gap: 10 },
  back: { padding: 4 },
  title: { color: '#fff', fontSize: 17, fontWeight: '900', writingDirection: 'rtl' },
  actionRow: { flexDirection: 'row-reverse', gap: 8, padding: 12, backgroundColor: Colors.BG },
  actionBtn: { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center' },
  actionBtnSecondary: { backgroundColor: '#fff', borderWidth: 2, borderColor: Colors.PRIMARY },
  actionBtnPrimary: { backgroundColor: Colors.PINK },
  actionTxtSec: { color: Colors.PRIMARY, fontWeight: '800', fontSize: 13 },
  actionTxtPri: { color: '#fff', fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3 },
  brokerName: { fontSize: 16, fontWeight: '900', color: Colors.TEXT, writingDirection: 'rtl' },
  brokerCo: { fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  brokerYears: { fontSize: 11, color: Colors.MUTED, marginTop: 2 },
  verifiedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  verifiedTxt: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  specBox: { backgroundColor: Colors.BG, padding: 8, borderRadius: 8, marginBottom: 10, gap: 3 },
  specRow: { fontSize: 11.5, color: Colors.TEXT, writingDirection: 'rtl', textAlign: 'right' },
  contactRow: { flexDirection: 'row-reverse', gap: 6 },
  contactBtn: { flex: 1, padding: 9, borderRadius: 8, alignItems: 'center' },
  contactTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
