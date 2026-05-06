import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

export default function ContactScreen() {
  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <View style={s.body}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>✉️</Text>
        <Text style={s.title}>צור קשר</Text>
        <Text style={s.sub}>כל שאלה, הצעה או חוויה</Text>

        <TouchableOpacity style={s.btn} onPress={() => Linking.openURL('https://wa.me/972502844867')}>
          <Text style={s.btnTxt}>💬 WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: Colors.PRIMARY }]} onPress={() => Linking.openURL('mailto:info@wellcomedubai.com')}>
          <Text style={s.btnTxt}>✉️ אימייל</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: Colors.WARM }]} onPress={() => Linking.openURL('https://wellcomedubai.com')}>
          <Text style={s.btnTxt}>🌐 האתר</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG },
  body: { flex: 1, padding: 28, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: Colors.TEXT, textAlign: 'center', marginTop: 8 },
  sub: { fontSize: 13, color: Colors.MUTED, textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: '#25D366', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
