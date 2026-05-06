import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: Colors.MUTED,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#E5E7EB', height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index"     options={{ title: 'בית',     tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text> }} />
      <Tabs.Screen name="map"       options={{ title: 'מפה',     tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🗺️</Text> }} />
      <Tabs.Screen name="favorites" options={{ title: 'המסע',   tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>❤️</Text> }} />
      <Tabs.Screen name="contact"   options={{ title: 'קשר',     tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>✉️</Text> }} />
    </Tabs>
  );
}
