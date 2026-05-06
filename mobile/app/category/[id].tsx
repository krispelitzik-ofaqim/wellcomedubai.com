import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { CATALOG } from '../../data/catalog';

const TITLES: Record<string, { he: string; emoji: string }> = {
  hotels:      { he: 'מלונות',          emoji: '🏨' },
  attractions: { he: 'אטרקציות',      emoji: '🎡' },
  restaurants: { he: 'מסעדות',         emoji: '🍽️' },
  shopping:    { he: 'קניות',           emoji: '🛍️' },
  nightlife:   { he: 'בילויים',         emoji: '🍻' },
  transport:   { he: 'תחבורה',          emoji: '🚕' },
  kids:        { he: 'ילדים ומשפחות', emoji: '👨‍👩‍👧' },
  casino:      { he: 'בידור ומשחקים', emoji: '🎰' },
};

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meta = TITLES[id || ''] || { he: 'קטגוריה', emoji: '📂' };
  const items: any[] = (CATALOG as any)[id || ''] || [];
  const sorted = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={{ fontSize: 22, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{meta.emoji} {meta.he}</Text>
        <View style={s.countBadge}><Text style={s.countTxt}>{items.length}</Text></View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 60 }}>
        {sorted.map(item => (
          <TouchableOpacity key={item.id} activeOpacity={0.85} style={s.card} onPress={() => item.lat && Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`)}>
            {item.image && /^https?:|^\//.test(item.image) ? (
              <Image source={{ uri: item.image.startsWith('http') ? item.image : `https://wellcomedubai.com/${item.image}` }} style={s.cardImg} />
            ) : (
              <View style={[s.cardImg, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 36 }}>{meta.emoji}</Text>
              </View>
            )}
            <View style={s.cardBody}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
                {item.rating ? <View style={s.ratingBadge}><Text style={s.ratingTxt}>⭐ {item.rating}</Text></View> : null}
              </View>
              {item.description ? <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
              <View style={s.cardFooter}>
                {item.priceRange ? <Text style={s.priceTxt}>{item.priceRange}</Text> : null}
                {item.address ? <Text style={s.addrTxt} numberOfLines={1}>📍 {item.address}</Text> : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG },
  header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.PRIMARY, gap: 10 },
  back: { padding: 4 },
  title: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '900', writingDirection: 'rtl' },
  countBadge: { backgroundColor: Colors.GOLD, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  countTxt: { color: Colors.PRIMARY, fontSize: 12, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  cardImg: { width: '100%', height: 140 },
  cardBody: { padding: 12 },
  cardHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: Colors.TEXT, writingDirection: 'rtl', textAlign: 'right' },
  ratingBadge: { backgroundColor: Colors.GOLD + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ratingTxt: { fontSize: 11, fontWeight: '800', color: '#92400e' },
  cardDesc: { fontSize: 12, color: Colors.MUTED, marginTop: 4, lineHeight: 17, writingDirection: 'rtl', textAlign: 'right' },
  cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 },
  priceTxt: { fontSize: 11, color: Colors.ACCENT, fontWeight: '800' },
  addrTxt: { flex: 1, fontSize: 11, color: Colors.MUTED, writingDirection: 'rtl', textAlign: 'left' },
});
