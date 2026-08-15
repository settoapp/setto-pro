import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export default function CoachBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadBookings();
  }, [filter]);

  async function loadBookings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('bookings')
      .select('*, profiles!bookings_client_id_fkey(full_name, phone), gyms(name)')
      .eq('coach_id', user.id)
      .eq('status', filter)
      .order('date', { ascending: true });
    if (data) setBookings(data);
    setLoading(false);
  }

  async function handleStatus(bookingId, newStatus) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);
    if (!error) {
      setBookings(bookings.filter(b => b.id !== bookingId));
    } else {
      Alert.alert('Eroare', error.message);
    }
  }

  const filterLabels = {
    pending: 'În așteptare',
    confirmed: 'Confirmate',
    cancelled: 'Anulate',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('CoachHome')}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Rezervări</Text>
        </View>

        {/* Filtre */}
        <View style={styles.filterRow}>
          {Object.keys(filterLabels).map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.filterBtn, filter === key && styles.filterBtnSelected]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextSelected]}>
                {filterLabels[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <Text style={styles.empty}>Se încarcă...</Text>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Nicio rezervare</Text>
            <Text style={styles.emptyDesc}>{filterLabels[filter].toLowerCase()}</Text>
          </View>
        ) : (
          bookings.map(booking => (
            <View key={booking.id} style={styles.bookingCard}>
              {/* Client */}
              <TouchableOpacity
                style={styles.clientRow}
                onPress={() => navigation.navigate('ClientProfile', { clientId: booking.client_id })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {booking.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{booking.profiles?.full_name || 'Client'}</Text>
                  <Text style={styles.clientPhone}>{booking.profiles?.phone || ''}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>

              {/* Detalii */}
              <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📅</Text>
                  <Text style={styles.detailText}>{DAYS[booking.day_of_week]}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>⏰</Text>
                  <Text style={styles.detailText}>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📍</Text>
                  <Text style={styles.detailText}>{booking.gyms?.name}</Text>
                </View>
              </View>

              {/* Butoane */}
              {filter === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.btnConfirm}
                    onPress={() => handleStatus(booking.id, 'confirmed')}
                  >
                    <Text style={styles.btnConfirmText}>✓ Acceptă</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => handleStatus(booking.id, 'cancelled')}
                  >
                    <Text style={styles.btnCancelText}>✕ Respinge</Text>
                  </TouchableOpacity>
                </View>
              )}

              {filter === 'confirmed' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => handleStatus(booking.id, 'no_show')}
                  >
                    <Text style={styles.btnCancelText}>Neprezentare</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => handleStatus(booking.id, 'cancelled')}
                  >
                    <Text style={styles.btnCancelText}>Anulează</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  header: { paddingTop: 16, marginBottom: 24 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  filterBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 10, alignItems: 'center', backgroundColor: colors.surface },
  filterBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterTextSelected: { color: '#fff' },
  empty: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 32 },
  emptyContainer: { alignItems: 'center', marginTop: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary },
  bookingCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  clientPhone: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  arrow: { fontSize: 20, color: colors.textSecondary },
  bookingDetails: { gap: 6, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 14, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 8 },
  btnConfirm: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnCancel: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});