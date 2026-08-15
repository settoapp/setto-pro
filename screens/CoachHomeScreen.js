import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

export default function CoachHomeScreen({ navigation }) {
  async function handleLogout() {
    await supabase.auth.signOut();
    navigation.navigate('Login');
  }

  const menuItems = [
    { icon: '📅', label: 'Calendar', screen: 'CoachCalendar', desc: 'Vezi și gestionează programările' },
    { icon: '📋', label: 'Rezervări', screen: 'CoachBookings', desc: 'Acceptă sau respinge cereri' },
    { icon: '👤', label: 'Profilul meu', screen: 'CoachProfileSetup', desc: 'Editează informațiile tale' },
    { icon: '🗓', label: 'Disponibilitate', screen: 'CoachAvailability', desc: 'Setează programul săptămânal' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bună ziua! 👋</Text>
            <Text style={styles.role}>Panou antrenor</Text>
          </View>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>S</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Delogare</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  role: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  logoIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoIconText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  menu: { flex: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  menuIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuIconText: { fontSize: 22 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  menuDesc: { fontSize: 13, color: colors.textSecondary },
  menuArrow: { fontSize: 22, color: colors.textSecondary },
  logoutBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  logoutText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
});