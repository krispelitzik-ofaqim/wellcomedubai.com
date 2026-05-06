import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ImageBackground, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

const QUICK_TILES = [
  { id: 'hotels',      title: 'מלונות',      sub: 'יוקרה ועד תקציבי',    icon: '🏨', tint: Colors.PRIMARY },
  { id: 'attractions', title: 'אטרקציות',  sub: 'חובה לראות',           icon: '🎡', tint: Colors.WARM },
  { id: 'restaurants', title: 'מסעדות',     sub: 'כשרות וטעימות',        icon: '🍽️', tint: Colors.ACCENT },
  { id: 'shopping',    title: 'קניות',       sub: 'שווקים וקניונים',     icon: '🛍️', tint: Colors.PINK },
];

export default function Home() {
  const { width } = useWindowDimensions();
  const tileW = (width - 14 * 2 - 10) / 2;
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.PRIMARY }}>
          <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&q=80' }} style={s.hero} imageStyle={{ opacity: 0.55 }}>
            <View style={s.heroInner}>
              <Text style={s.heroKicker}>🇦🇪 DUBAI · UAE</Text>
              <Text style={s.heroTitle}>WellCome Dubai</Text>
              <Text style={s.heroSub}>המדריך הישראלי השלם לדובאי</Text>
            </View>
          </ImageBackground>
        </SafeAreaView>

        <View style={[s.grid, { paddingHorizontal: 14 }]}>
          {QUICK_TILES.map(t => (
            <TouchableOpacity key={t.id} activeOpacity={0.8} onPress={() => router.push(`/category/${t.id}` as any)} style={[s.tile, { width: tileW, borderColor: t.tint + '30' }]}>
              <View style={[s.tileBar, { backgroundColor: t.tint }]} />
              <Text style={s.tileIcon}>{t.icon}</Text>
              <Text style={s.tileTitle}>{t.title}</Text>
              <Text style={s.tileSub}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.9} style={s.reBanner} onPress={() => router.push('/realestate' as any)}>
          <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1582407947092-45795aba4166?w=1200&q=80' }} style={{ flex: 1 }} imageStyle={{ borderRadius: 16, opacity: 0.85 }}>
            <View style={s.reOverlay}>
              <Text style={s.reKicker}>DUBAI REAL ESTATE</Text>
              <Text style={s.reTitle}>פורטל הנדל"ן</Text>
              <Text style={s.reSub}>מאמרים · מודעות · מתווכים</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG },
  hero: { height: 220, justifyContent: 'flex-end', backgroundColor: Colors.PRIMARY },
  heroInner: { padding: 22, paddingBottom: 24 },
  heroKicker: { color: Colors.GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 6, fontWeight: '500', writingDirection: 'rtl', textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  tile: { backgroundColor: '#fff', borderRadius: 14, padding: 16, paddingTop: 22, borderWidth: 1, position: 'relative', overflow: 'hidden', minHeight: 120 },
  tileBar: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 5 },
  tileIcon: { fontSize: 30, marginBottom: 6 },
  tileTitle: { fontSize: 16, fontWeight: '900', color: Colors.TEXT, writingDirection: 'rtl' },
  tileSub: { fontSize: 11, color: Colors.MUTED, marginTop: 2, writingDirection: 'rtl' },
  reBanner: { height: 130, marginHorizontal: 14, marginTop: 22, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.PRIMARY },
  reOverlay: { flex: 1, backgroundColor: 'rgba(26,107,138,0.65)', padding: 18, borderRadius: 16, justifyContent: 'center' },
  reKicker: { color: Colors.GOLD, fontSize: 11, letterSpacing: 2, fontWeight: '800' },
  reTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4, writingDirection: 'rtl' },
  reSub: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginTop: 4, writingDirection: 'rtl' },
});
