import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

export default function FavoritesScreen() {
  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <View style={s.placeholder}>
        <Text style={{ fontSize: 48 }}>❤️</Text>
        <Text style={s.title}>המועדפים שלי</Text>
        <Text style={s.sub}>שמור מקומות שאהבת בלחיצה על הלב</Text>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.TEXT },
  sub: { fontSize: 13, color: Colors.MUTED, paddingHorizontal: 30, textAlign: 'center' },
});
