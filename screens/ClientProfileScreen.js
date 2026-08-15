import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Linking } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export default function ClientProfileScreen({ route, navigation }) {
  const { clientId } = route.params;
  const [client, setClient] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: clientData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();
      if (clientData) setClient(clientData);

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });
      if (bookingData) setBookings(bookingData);

      setLoading(false);
    }
    load();
  }, []);

  function handleCall() {
    if (!client?.phone) return;
    Linking.openURL(`tel:${client.phone}`);
  }

  function handleSMS() {
    if (!client?.phone) return;
    Linking.openURL(`sms:${client.phone}`);
  }

  function handleWhatsApp() {
    if (!client?.phone) return;
    const phone = client.phone.replace(/\s/g, '').replace('+', '');
    Linking.openURL(`https://wa.me/${phone}`);
  }

  const finalizate = bookings.filter(b => b.status === 'confirmed').length;
  const anulari = bookings.filter(b => b.status === 'cancelled').length;
  const neprezentari = bookings.filter(b => b.status === 'no_show').length;
  const ultimaVizita = bookings.find(b => b.status === 'confirmed')?.date;

  const initials = client?.full_name
    ? client.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Înapoi</Text>
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{client?.full_name || 'Client'}</Text>
          <Text style={styles.phone}>{client?.phone || 'Fără număr de telefon'}</Text>
        </View>

        {/* Contact */}
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>📞</Text>
            </View>
            <Text style={styles.contactLabel}>Apel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={handleSMS}>
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>💬</Text>
            </View>
            <Text style={styles.contactLabel}>SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtn} onPress={handleWhatsApp}>
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>🟢</Text>
            </View>
            <Text style={styles.contactLabel}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Statistici */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{finalizate}</Text>
              <Text style={styles.statLabel}>FINALIZATE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{anulari}</Text>
              <Text style={styles.statLabel}>ANULĂRI</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{neprezentari}</Text>
              <Text style={styles.statLabel}>NEPREZENTĂRI</Text>
            </View>
          </View>
          {ultimaVizita && (
            <View style={styles.lastVisit}>
              <Text style={styles.lastVisitLabel}>Ultima vizită</Text>
              <Text style={styles.lastVisitValue}>{ultimaVizita}</Text>
            </View>
          )}
        </View>

        {/* Rezervări */}
        <Text style={styles.sectionTitle}>Programări</Text>
        {bookings.length === 0 ? (
          <Text style={styles.empty}>Nicio programare încă.</Text>
        ) : (
          bookings.map(booking => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={[styles.statusDot,
                booking.status === 'confirmed' && styles.dotConfirmed,
                booking.status === 'pending' && styles.dotPending,
                booking.status === 'cancelled' && styles.dotCancelled,
              ]} />
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingDay}>{DAYS[booking.day_of_week]}</Text>
                <Text style={styles.bookingTime}>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</Text>
              </View>
              <Text style={styles.bookingStatus}>
                {booking.status === 'confirmed' ? 'Confirmat' :
                  booking.status === 'pending' ? 'În așteptare' :
                  booking.status === 'cancelled' ? 'Anulat' : booking.status}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 15 },
  backBtn: { paddingTop: 16, marginBottom: 24 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  hero: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  phone: { fontSize: 15, color: colors.textSecondary },
  contactRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 28 },
  contactBtn: { alignItems: 'center' },
  contactIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  contactIconText: { fontSize: 22 },
  contactLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  statsCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: colors.border },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border },
  lastVisit: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  lastVisitLabel: { fontSize: 13, color: colors.textSecondary },
  lastVisitValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  empty: { color: colors.textSecondary, fontSize: 14 },
  bookingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  dotConfirmed: { backgroundColor: '#10B981' },
  dotPending: { backgroundColor: '#F59E0B' },
  dotCancelled: { backgroundColor: '#EF4444' },
  bookingInfo: { flex: 1 },
  bookingDay: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  bookingTime: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  bookingStatus: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
});