import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Linking, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { RE_ARTICLES, RE_INVESTMENTS, ISRAELI_TO_UAE } from '../constants/realestate';

const TABS = [
  { id: 'sale',     label: 'דירות למכירה', icon: '🏠', color: Colors.PRIMARY },
  { id: 'rent',     label: 'דירות להשכרה', icon: '🔑', color: Colors.SECONDARY },
  { id: 'invest',   label: 'פורטל הנדל"ן',   icon: '📊', color: Colors.ACCENT },
];

export default function RealEstateScreen() {
  const [tab, setTab] = useState<'sale' | 'rent' | 'invest'>('invest');

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={{ fontSize: 22, color: '#fff' }}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>📊 פורטל הנדל"ן בדובאי</Text>
      </View>

      <View style={s.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, { backgroundColor: tab === t.id ? t.color : '#fff', borderColor: tab === t.id ? 'transparent' : '#E5E7EB' }]}
            onPress={() => setTab(t.id as any)}
          >
            <Text style={{ fontSize: 22 }}>{t.icon}</Text>
            <Text style={[s.tabLabel, { color: tab === t.id ? '#fff' : Colors.TEXT }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {tab === 'invest' && <InvestContent />}
        {(tab === 'sale' || tab === 'rent') && <ListingsPlaceholder type={tab} />}
        <BrokersBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

function InvestContent() {
  return (
    <>
      <SectionTitle emoji="📚" title="מאמרים ומדריכים" color={Colors.PRIMARY} />
      {RE_ARTICLES.map(a => (
        <View key={a.id} style={s.articleCard}>
          <View style={s.articleHeader}>
            <View style={s.articleIcon}><Text style={{ fontSize: 22 }}>{a.icon}</Text></View>
            <Text style={s.articleTitle}>{a.title}</Text>
          </View>
          <Text style={s.articleBody}>{a.body}</Text>
        </View>
      ))}

      <View style={s.whyBanner}>
        <Text style={s.whyKicker}>למה דובאי?</Text>
        <Text style={s.whyTitle}>היעד החם בעולם להשקעות נדל"ן 🔥</Text>
        <View style={s.whyGrid}>
          <Text style={s.whyItem}>✓ 0% מס הכנסה אישי</Text>
          <Text style={s.whyItem}>✓ 4% מס רכישה</Text>
          <Text style={s.whyItem}>✓ תשואות 6-12%</Text>
          <Text style={s.whyItem}>✓ ויזת משקיע מ-AED 750K</Text>
        </View>
      </View>

      <SectionTitle emoji="🇮🇱" title="ישראלים בדובאי" color={Colors.PINK} />
      <View style={s.israeliBox}>
        <Text style={s.israeliSub}>מאז הסכמי אברהם (2020)</Text>
        {Object.entries(ISRAELI_TO_UAE).reverse().slice(0, 4).map(([y, v]) => (
          <View key={y} style={s.barRow}>
            <Text style={s.barYear}>{y}</Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${(v / 700000) * 100}%` }]} />
            </View>
            <Text style={s.barValue}>{(v / 1000).toFixed(0)}K</Text>
          </View>
        ))}
      </View>

      <SectionTitle emoji="🏙️" title="אזורי השקעה מובילים" color={Colors.WARM} />
      {RE_INVESTMENTS.map((inv, i) => (
        <View key={inv.area} style={s.investCard}>
          <View style={s.investHeader}>
            <View style={s.investNum}><Text style={s.investNumTxt}>{i + 1}</Text></View>
            <Text style={s.investArea}>{inv.area}</Text>
            <View style={s.yieldBadge}>
              <Text style={s.yieldTxt}>⚡ {inv.yield}</Text>
            </View>
          </View>
          <Text style={s.investEntry}>כניסה מ-<Text style={{ fontWeight: '900', color: Colors.PRIMARY }}>{inv.entry}</Text></Text>
          <Text style={s.investHl}>{inv.highlight}</Text>
        </View>
      ))}
    </>
  );
}

function ListingsPlaceholder({ type }: { type: 'sale' | 'rent' }) {
  return (
    <View style={s.placeholder}>
      <Text style={{ fontSize: 50 }}>🚧</Text>
      <Text style={s.placeholderTitle}>מודעות {type === 'sale' ? 'למכירה' : 'להשכרה'}</Text>
      <Text style={s.placeholderSub}>מערכת ניהול מודעות פעילה. השלב הבא: חיבור הגולשים לפרסום מהאפליקציה.</Text>
    </View>
  );
}

function BrokersBanner() {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/brokers' as any)} style={s.brokersBanner}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80' }}
        style={{ flex: 1 }}
        imageStyle={{ borderRadius: 14 }}
      >
        <View style={s.brokersOverlay}>
          <Text style={s.brokersKicker}>BROKERS</Text>
          <Text style={s.brokersTitle}>סוכני נדל"ן מומלצים</Text>
          <Text style={s.brokersSub}>4 מתווכים דוברי עברית · רישיון RERA</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function SectionTitle({ emoji, title, color }: { emoji: string; title: string; color: string }) {
  return (
    <View style={[sec.wrap, { borderRightColor: color, backgroundColor: color + '15' }]}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={[sec.title, { color }]}>{title}</Text>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderRightWidth: 5, marginTop: 18, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '900', writingDirection: 'rtl' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG },
  header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.PRIMARY, gap: 10 },
  back: { padding: 4 },
  title: { color: '#fff', fontSize: 17, fontWeight: '900', writingDirection: 'rtl' },
  tabsRow: { flexDirection: 'row-reverse', padding: 14, gap: 8, backgroundColor: Colors.BG },
  tabBtn: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '800', writingDirection: 'rtl', textAlign: 'center' },

  articleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  articleHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  articleIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.PRIMARY + '15', alignItems: 'center', justifyContent: 'center' },
  articleTitle: { flex: 1, fontWeight: '800', color: Colors.TEXT, fontSize: 14, writingDirection: 'rtl', textAlign: 'right' },
  articleBody: { fontSize: 12.5, color: Colors.TEXT, lineHeight: 19, writingDirection: 'rtl', textAlign: 'right' },

  whyBanner: { backgroundColor: Colors.ACCENT, borderRadius: 14, padding: 14, marginTop: 16 },
  whyKicker: { color: '#fff', fontSize: 11, fontWeight: '700', opacity: 0.9, marginBottom: 4, letterSpacing: 1 },
  whyTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  whyGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  whyItem: { color: '#fff', fontSize: 12, fontWeight: '600', width: '48%' },

  israeliBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderRightWidth: 4, borderRightColor: Colors.PINK },
  israeliSub: { fontSize: 11, color: Colors.MUTED, marginBottom: 6, writingDirection: 'rtl', textAlign: 'right' },
  barRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 5 },
  barYear: { width: 38, fontSize: 11, fontWeight: '700', color: Colors.MUTED },
  barTrack: { flex: 1, height: 12, backgroundColor: '#F5EFE6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.PINK },
  barValue: { width: 48, fontSize: 12, fontWeight: '800', color: Colors.PINK, textAlign: 'left' },

  investCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  investHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 6 },
  investNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.WARM, alignItems: 'center', justifyContent: 'center' },
  investNumTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  investArea: { flex: 1, fontWeight: '800', color: Colors.TEXT, fontSize: 14, writingDirection: 'rtl' },
  yieldBadge: { backgroundColor: Colors.WARM + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  yieldTxt: { color: Colors.ACCENT, fontWeight: '800', fontSize: 11 },
  investEntry: { fontSize: 12, color: Colors.MUTED, marginBottom: 4, writingDirection: 'rtl', textAlign: 'right' },
  investHl: { fontSize: 12, color: Colors.MUTED, lineHeight: 17, writingDirection: 'rtl', textAlign: 'right' },

  placeholder: { alignItems: 'center', padding: 30, gap: 10 },
  placeholderTitle: { fontSize: 18, fontWeight: '800', color: Colors.TEXT },
  placeholderSub: { fontSize: 13, color: Colors.MUTED, textAlign: 'center' },

  brokersBanner: { height: 110, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  brokersOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14 },
  brokersKicker: { color: Colors.GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  brokersTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  brokersSub: { color: 'rgba(255,255,255,0.95)', fontSize: 12, marginTop: 4 },
});
