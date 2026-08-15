import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, TextInput, Alert, Platform } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const CELL_HEIGHT = 80;
const HOUR_COL_WIDTH = 70;

function getWeekDates(weekOffset) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function timeToMinutes(time) {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function isSameDay(d1, d2) {
  return d1.toDateString() === d2.toDateString();
}

function isPastDay(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export default function CoachCalendarScreen({ navigation }) {
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 768;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [modal, setModal] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [userId, setUserId] = useState(null);
  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('');
  const [blockEndTime, setBlockEndTime] = useState('');
  const [sessionType, setSessionType] = useState('one_to_one');
  const [clientSearch, setClientSearch] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const weekDates = getWeekDates(weekOffset);
  const weekLabel = `${weekDates[0].getDate()} - ${weekDates[6].getDate()} ${MONTHS[weekDates[6].getMonth()]}`;
  const startHour = HOURS[0];
  const DAY_WIDTH = Math.floor((screenWidth - HOUR_COL_WIDTH) / 7);

  const filteredClients = clientSearch.length > 0
    ? clients.filter(c =>
        c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.includes(clientSearch)
      )
    : clients;

  useEffect(() => {
    loadData();
  }, [weekOffset, refreshKey]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user.id);
    const startDate = weekDates[0].toISOString().split('T')[0];
    const endDate = weekDates[6].toISOString().split('T')[0];

    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*, profiles!bookings_client_id_fkey(full_name)')
      .eq('coach_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['pending', 'confirmed']);
    if (bookingData) setBookings(bookingData);

    const { data: blockedData } = await supabase
      .from('blocked_slots')
      .select('*')
      .eq('coach_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);
    if (blockedData) setBlockedSlots(blockedData);

    const { data: availData } = await supabase
      .from('availability')
      .select('*, gyms(name)')
      .eq('coach_id', user.id);
    if (availData) setAvailability(availData);

    const { data: clientData } = await supabase
      .from('bookings')
      .select('client_id, profiles!bookings_client_id_fkey(full_name, phone)')
      .eq('coach_id', user.id);
    if (clientData) {
      const unique = [];
      const seen = new Set();
      for (const c of clientData) {
        if (!seen.has(c.client_id)) {
          seen.add(c.client_id);
          unique.push({ id: c.client_id, ...c.profiles });
        }
      }
      setClients(unique);
    }
  }

  async function handleStatus(bookingId, newStatus) {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
    if (!error) {
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null);
      if (newStatus === 'cancelled') setModal(null);
    }
  }

  async function handleBlock() {
    if (!blockStartDate || !blockStartTime || !blockEndTime) {
      Alert.alert('Eroare', 'Completează data și orele.');
      return;
    }
    if (blockStartTime >= blockEndTime) {
      Alert.alert('Eroare', 'Ora de sfârșit trebuie să fie după ora de început.');
      return;
    }
    const endDate = blockEndDate || blockStartDate;
    const start = new Date(blockStartDate);
    const end = new Date(endDate);
    if (end < start) {
      Alert.alert('Eroare', 'Data de sfârșit trebuie să fie după data de început.');
      return;
    }
    const inserts = [];
    const current = new Date(start);
    while (current <= end) {
      inserts.push({
        coach_id: userId,
        date: current.toISOString().split('T')[0],
        start_time: blockStartTime,
        end_time: blockEndTime,
        reason: blockReason || null,
      });
      current.setDate(current.getDate() + 1);
    }
    const { error } = await supabase.from('blocked_slots').insert(inserts);
    if (!error) {
      setModal(null);
      setBlockReason('');
      setBlockStartDate('');
      setBlockEndDate('');
      setBlockStartTime('');
      setBlockEndTime('');
      setRefreshKey(k => k + 1);
    } else {
      Alert.alert('Eroare', error.message);
    }
  }

  async function handleManualBooking() {
    if (!selectedSlot) return;
    let clientId = selectedClient?.id;
    if (showNewClient) {
      if (!newClientName) { Alert.alert('Eroare', 'Introdu numele clientului.'); return; }
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({ full_name: newClientName, phone: newClientPhone, role: 'client' })
        .select().single();
      if (profileError) { Alert.alert('Eroare', profileError.message); return; }
      clientId = newProfile.id;
    }
    if (!clientId) { Alert.alert('Eroare', 'Alege sau adaugă un client.'); return; }
    const { error } = await supabase.from('bookings').insert({
      coach_id: userId,
      client_id: clientId,
      date: selectedSlot.date,
      start_time: selectedSlot.startTime,
      end_time: selectedSlot.endTime,
      day_of_week: selectedSlot.dayOfWeek,
      status: 'confirmed',
      session_type: sessionType,
    });
    if (!error) {
      setModal(null);
      setSelectedCell(null);
      setSelectedSlot(null);
      setSelectedClient(null);
      setSessionType('one_to_one');
      setClientSearch('');
      setShowNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setRefreshKey(k => k + 1);
    } else {
      Alert.alert('Eroare', error.message);
    }
  }

  async function handleDeleteBlock(blockId) {
    await supabase.from('blocked_slots').delete().eq('id', blockId);
    setBlockedSlots(blockedSlots.filter(b => b.id !== blockId));
    setModal(null);
  }

  function getAvailabilityForDate(date) {
    const dayOfWeek = (date.getDay() + 6) % 7;
    return availability.filter(a => a.day_of_week === dayOfWeek);
  }

  function isAvailable(date, hour) {
    return getAvailabilityForDate(date).some(a => {
      const startH = parseInt(a.start_time.slice(0, 2));
      const endH = parseInt(a.end_time.slice(0, 2));
      return hour >= startH && hour < endH;
    });
  }

  function getAvailabilityBlocksForDay(date) {
    const avails = getAvailabilityForDate(date);
    const slots = [];
    for (const avail of avails) {
      const startMins = timeToMinutes(avail.start_time);
      const endMins = timeToMinutes(avail.end_time);
      const duration = avail.duration_minutes || 60;
      let current = startMins;
      while (current + duration <= endMins) {
        slots.push({ ...avail, start_time: minutesToTime(current), end_time: minutesToTime(current + duration) });
        current += duration;
      }
    }
    return slots;
  }

  function getBookingsForDay(date) {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => b.date === dateStr);
  }

  function getBlockedForDay(date) {
    const dateStr = date.toISOString().split('T')[0];
    return blockedSlots.filter(b => b.date === dateStr);
  }

  function handleCellPress(date, hour) {
    if (isPastDay(date)) return;
    if (!isAvailable(date, hour)) return;
    const dateStr = date.toISOString().split('T')[0];
    const startTime = minutesToTime(hour * 60);
    const endTime = minutesToTime((hour + 1) * 60);
    const cellKey = `${dateStr}-${hour}`;
    setSelectedCell(cellKey);
    setBlockStartDate(dateStr);
    setBlockEndDate('');
    setBlockStartTime(startTime);
    setBlockEndTime(endTime);
    setSelectedSlot({
      date: dateStr,
      startTime,
      endTime,
      dayOfWeek: (date.getDay() + 6) % 7,
      displayDate: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
    });
    setModal('slot');
  }

  // ---- MOBILE VIEW ----
const renderMobileView = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    const dayAvailSlots = getAvailabilityBlocksForDay(selectedDate);
    const dayBookings = getBookingsForDay(selectedDate);
    const dayBlocked = getBlockedForDay(selectedDate);

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Navigare saptamana */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4 }}>
          <TouchableOpacity onPress={() => { setWeekOffset(w => w - 1); }}>
            <Text style={{ fontSize: 22, color: colors.primary }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
            {days[0]?.getDate()} - {days[6]?.getDate()} {MONTHS[days[6]?.getMonth()]}
          </Text>
          <TouchableOpacity onPress={() => { setWeekOffset(w => w + 1); }}>
            <Text style={{ fontSize: 22, color: colors.primary }}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Bara zile */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {days.map((date, i) => {
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            const isPast = isPastDay(date);
            const dayIndex = (date.getDay() + 6) % 7;
            return (
              <TouchableOpacity
                key={i}
                style={{ alignItems: 'center', flex: 1 }}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  { fontSize: 11, marginBottom: 4, fontWeight: '500' },
                  isPast ? { color: '#ccc' } : isSelected ? { color: colors.primary } : { color: colors.textSecondary }
                ]}>
                  {DAYS_SHORT[dayIndex]}
                </Text>
                <View style={[
                  { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
                  isToday && !isSelected && { borderWidth: 2, borderColor: colors.primary },
                  isSelected && { backgroundColor: colors.primary },
                ]}>
                  <Text style={[
                    { fontSize: 15 },
                    isPast && { color: '#ccc' },
                    isSelected && { color: '#fff', fontWeight: '800' },
                    !isPast && !isSelected && { fontWeight: '700', color: colors.textPrimary },
                  ]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Grid zi */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: HOUR_COL_WIDTH }}>
              {HOURS.map(hour => (
                <View key={hour} style={{ height: CELL_HEIGHT, justifyContent: 'flex-start', paddingTop: 4 }}>
                  <Text style={styles.hourText}>{hour}:00</Text>
                </View>
              ))}
            </View>

            <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colors.border }}>
              {HOURS.map(hour => {
                const available = isAvailable(selectedDate, hour);
                const dateStr = selectedDate.toISOString().split('T')[0];
                const cellKey = `${dateStr}-${hour}`;
                const isSelectedCell = selectedCell === cellKey;
                return (
                  <TouchableOpacity
                    key={hour}
                    style={{
                      height: CELL_HEIGHT,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: isSelectedCell
                        ? colors.accent
                        : isPastDay(selectedDate)
                        ? '#f8f8f8'
                        : available
                        ? '#fff'
                        : '#fdf6f0',
                    }}
                    onPress={() => handleCellPress(selectedDate, hour)}
                    disabled={!available || isPastDay(selectedDate)}
                  />
                );
              })}

              {dayAvailSlots.map((slot, ai) => {
                const startMins = timeToMinutes(slot.start_time);
                const endMins = timeToMinutes(slot.end_time);
                const topOffset = (startMins - startHour * 60) * (CELL_HEIGHT / 60);
                const height = (endMins - startMins) * (CELL_HEIGHT / 60);
                return (
                  <View key={ai} style={[styles.availBlock, { top: topOffset, height }]} pointerEvents="none">
                    <Text style={styles.availBlockTime}>{slot.start_time.slice(0, 5)}</Text>
                    {slot.gyms?.name && <Text style={styles.availBlockGym} numberOfLines={1}>{slot.gyms.name}</Text>}
                  </View>
                );
              })}

              {dayBookings.map(booking => {
                const startMins = timeToMinutes(booking.start_time);
                const endMins = timeToMinutes(booking.end_time);
                const topOffset = (startMins - startHour * 60) * (CELL_HEIGHT / 60);
                const height = (endMins - startMins) * (CELL_HEIGHT / 60);
                return (
                  <TouchableOpacity
                    key={booking.id}
                    style={[styles.bookingBlock, { top: topOffset, height: Math.max(height, 40) }, booking.status === 'confirmed' ? styles.bookingConfirmed : styles.bookingPending]}
                    onPress={() => { setSelectedBooking(booking); setSelectedCell(null); setModal('booking'); }}
                  >
                    <Text style={styles.bookingName} numberOfLines={1}>{booking.profiles?.full_name || 'Client'}</Text>
                    <Text style={styles.bookingTime}>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</Text>
                  </TouchableOpacity>
                );
              })}

              {dayBlocked.map(block => {
                const startMins = timeToMinutes(block.start_time);
                const endMins = timeToMinutes(block.end_time);
                const topOffset = (startMins - startHour * 60) * (CELL_HEIGHT / 60);
                const height = (endMins - startMins) * (CELL_HEIGHT / 60);
                return (
                  <TouchableOpacity
                    key={block.id}
                    style={[styles.bookingBlock, styles.blockedBlock, { top: topOffset, height: Math.max(height, 40) }]}
                    onPress={() => { setSelectedBooking(block); setSelectedCell(null); setModal('blocked'); }}
                  >
                    <Text style={styles.bookingName}>🔒 Blocat</Text>
                    {block.reason && <Text style={styles.bookingTime}>{block.reason}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {renderModals()}
      </View>
    );
  };
  
  // ---- DESKTOP VIEW ----
  const renderDesktopView = () => {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Calendar</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => { setWeekOffset(w => w - 1); setModal(null); setSelectedCell(null); }}>
            <Text style={styles.navBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity onPress={() => { setWeekOffset(w => w + 1); setModal(null); setSelectedCell(null); }}>
            <Text style={styles.navBtn}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.daysHeader}>
          <View style={{ width: HOUR_COL_WIDTH }} />
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, new Date());
            const dayAvails = getAvailabilityForDate(date);
            const gymNames = [...new Set(dayAvails.map(a => a.gyms?.name).filter(Boolean))];
            return (
              <View key={i} style={[styles.dayHeaderCol, { width: DAY_WIDTH }]}>
                <Text style={styles.dayHeaderName}>{DAYS_SHORT[i]}</Text>
                <View style={[styles.dayHeaderCircle, isToday && styles.dayHeaderCircleToday]}>
                  <Text style={[styles.dayHeaderNum, isToday && styles.dayHeaderNumToday]}>{date.getDate()}</Text>
                </View>
                {gymNames.length > 0 && (
                  <Text style={styles.gymLabel} numberOfLines={1}>{gymNames.join(', ')}</Text>
                )}
              </View>
            );
          })}
        </View>

        <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: HOUR_COL_WIDTH }}>
              {HOURS.map(hour => (
                <View key={hour} style={{ height: CELL_HEIGHT, justifyContent: 'flex-start', paddingTop: 4 }}>
                  <Text style={styles.hourText}>{hour}:00</Text>
                </View>
              ))}
            </View>

            {weekDates.map((date, di) => {
              const dayBookings = getBookingsForDay(date);
              const dayBlocked = getBlockedForDay(date);
              const dayAvailSlots = getAvailabilityBlocksForDay(date);
              const past = isPastDay(date);
              const dateStr = date.toISOString().split('T')[0];

              return (
                <View key={di} style={{ width: DAY_WIDTH, borderLeftWidth: 1, borderLeftColor: colors.border }}>
                  {HOURS.map(hour => {
                    const available = isAvailable(date, hour);
                    const cellKey = `${dateStr}-${hour}`;
                    const isSelectedCell = selectedCell === cellKey;
                    return (
                      <TouchableOpacity
                        key={hour}
                        style={{
                          height: CELL_HEIGHT,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                          backgroundColor: isSelectedCell ? colors.accent : past ? '#f8f8f8' : available ? '#fff' : '#fdf6f0',
                        }}
                        onPress={() => handleCellPress(date, hour)}
                        disabled={!available || past}
                      />
                    );
                  })}

                  {dayAvailSlots.map((slot, ai) => {
                    const startMins = timeToMinutes(slot.start_time);
                    const endMins = timeToMinutes(slot.end_time);
                    const topOffset = (startMins - startHour * 60) * (CELL_HEIGHT / 60);
                    const height = (endMins - startMins) * (CELL_HEIGHT / 60);
                    return (
                      <View key={ai} style={[styles.availBlock, { top: topOffset, height }]} pointerEvents="none">
                        <Text style={styles.availBlockTime}>{slot.start_time.slice(0, 5)}</Text>
                      </View>
                    );
                  })}

                  {dayBookings.map(booking => {
                    const startMins = timeToMinutes(booking.start_time);
                    const endMins = timeToMinutes(booking.end_time);
                    const topOffset = (startMins - startHour * 60) * (CELL_HEIGHT / 60);
                    const height = (endMins - startMins) * (CELL_HEIGHT / 60);
                    return (
                      <TouchableOpacity
                        key={booking.id}
                        style={[styles.bookingBlock, { top: topOffset, height: Math.max(height, 30) }, booking.status === 'confirmed' ? styles.bookingConfirmed : styles.bookingPending]}
                        onPress={() => { setSelectedBooking(booking); setSelectedCell(null); setModal('booking'); }}
                      >
                        <Text style={styles.bookingName} numberOfLines={1}>{booking.profiles?.full_name || 'Client'}</Text>
                        {height >= 40 && <Text style={styles.bookingTime}>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</Text>}
                      </TouchableOpacity>
                    );
                  })}

                  {dayBlocked.map(block => {
                    const startMins = timeToMinutes(block.start_time);
                    const endMins = timeToMinutes(block.end_time);
                    const topOffset = (startMins - startHour * 60) * (CELL_HEIGHT / 60);
                    const height = (endMins - startMins) * (CELL_HEIGHT / 60);
                    return (
                      <TouchableOpacity
                        key={block.id}
                        style={[styles.bookingBlock, styles.blockedBlock, { top: topOffset, height: Math.max(height, 30) }]}
                        onPress={() => { setSelectedBooking(block); setSelectedCell(null); setModal('blocked'); }}
                      >
                        <Text style={styles.bookingName}>🔒 Blocat</Text>
                        {block.reason && <Text style={styles.bookingTime}>{block.reason}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {renderModals()}
      </View>
    );
  };

  const renderModals = () => (
    <>
      {modal === 'booking' && selectedBooking && (
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalName}>{selectedBooking.profiles?.full_name || 'Client'}</Text>
              <Text style={styles.modalTime}>{selectedBooking.start_time?.slice(0, 5)} - {selectedBooking.end_time?.slice(0, 5)}</Text>
              <Text style={styles.modalStatus}>{selectedBooking.status === 'pending' ? '⏳ În așteptare' : '✓ Confirmat'}</Text>
            </View>
            <TouchableOpacity onPress={() => { setModal(null); setSelectedCell(null); }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBtns}>
            {selectedBooking.status === 'pending' && (
              <TouchableOpacity style={styles.btnConfirm} onPress={() => handleStatus(selectedBooking.id, 'confirmed')}>
                <Text style={styles.btnConfirmText}>✓ Acceptă</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnCancel} onPress={() => handleStatus(selectedBooking.id, 'cancelled')}>
              <Text style={styles.btnCancelText}>{selectedBooking.status === 'pending' ? '✕ Respinge' : 'Anulează'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnProfile} onPress={() => { setModal(null); setSelectedCell(null); navigation.navigate('ClientProfile', { clientId: selectedBooking.client_id }); }}>
              <Text style={styles.btnProfileText}>Vezi profil</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {modal === 'slot' && selectedSlot && (
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalName}>{selectedSlot.displayDate}</Text>
              <Text style={styles.modalTime}>{selectedSlot.startTime} - {selectedSlot.endTime}</Text>
            </View>
            <TouchableOpacity onPress={() => { setModal(null); setSelectedCell(null); }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.btnConfirm} onPress={() => setModal('manual')}>
              <Text style={styles.btnConfirmText}>👤 Programează client</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancel} onPress={() => setModal('block')}>
              <Text style={styles.btnCancelText}>🔒 Blochează</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {modal === 'block' && (
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalName}>Blochează interval</Text>
            <TouchableOpacity onPress={() => setModal('slot')}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Începând cu</Text>
          <View style={styles.dateTimeRow}>
            <input type="date" style={{ flex: 1, padding: 12, fontSize: 15, borderRadius: 10, border: '1px solid #E5E7EB', boxSizing: 'border-box', marginRight: 8, backgroundColor: '#F8F9FA' }} value={blockStartDate} onChange={e => setBlockStartDate(e.target.value)} />
            <input type="time" step="300" style={{ flex: 1, padding: 12, fontSize: 15, borderRadius: 10, border: '1px solid #E5E7EB', boxSizing: 'border-box', backgroundColor: '#F8F9FA' }} value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)} />
          </View>
          <Text style={styles.label}>Până în</Text>
          <View style={styles.dateTimeRow}>
            <input type="date" style={{ flex: 1, padding: 12, fontSize: 15, borderRadius: 10, border: '1px solid #E5E7EB', boxSizing: 'border-box', marginRight: 8, backgroundColor: '#F8F9FA' }} value={blockEndDate || blockStartDate} onChange={e => setBlockEndDate(e.target.value)} />
            <input type="time" step="300" style={{ flex: 1, padding: 12, fontSize: 15, borderRadius: 10, border: '1px solid #E5E7EB', boxSizing: 'border-box', backgroundColor: '#F8F9FA' }} value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} />
          </View>
          <Text style={styles.label}>Motiv (opțional)</Text>
          <TextInput style={styles.input} placeholder="Ex: Concediu, Pauză, etc." placeholderTextColor={colors.textSecondary} value={blockReason} onChangeText={setBlockReason} />
          <TouchableOpacity style={[styles.btnConfirm, { marginTop: 8 }]} onPress={handleBlock}>
            <Text style={styles.btnConfirmText}>Confirmă blocarea</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {modal === 'manual' && selectedSlot && (
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalName}>Programează client</Text>
            <TouchableOpacity onPress={() => setModal('slot')}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalTime}>{selectedSlot.displayDate} · {selectedSlot.startTime} - {selectedSlot.endTime}</Text>
          <Text style={styles.label}>Tip sesiune</Text>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.btnCancel, sessionType === 'one_to_one' && styles.btnConfirm]} onPress={() => setSessionType('one_to_one')}>
              <Text style={[styles.btnCancelText, sessionType === 'one_to_one' && styles.btnConfirmText]}>👤 One to One</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnCancel, sessionType === 'group' && styles.btnConfirm]} onPress={() => setSessionType('group')}>
              <Text style={[styles.btnCancelText, sessionType === 'group' && styles.btnConfirmText]}>👥 Grup</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Caută client</Text>
          <TextInput style={styles.input} placeholder="Caută după nume sau telefon..." placeholderTextColor={colors.textSecondary} value={clientSearch} onChangeText={setClientSearch} />
          {filteredClients.length > 0 && (
            <ScrollView style={{ maxHeight: 150 }}>
              {filteredClients.map(client => (
                <TouchableOpacity key={client.id} style={[styles.clientRow, selectedClient?.id === client.id && styles.clientRowSelected]} onPress={() => { setSelectedClient(client); setClientSearch(''); setShowNewClient(false); }}>
                  <Text style={styles.clientName}>{client.full_name || 'Client'}</Text>
                  <Text style={styles.clientPhone}>{client.phone || ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {selectedClient && !showNewClient && (
            <View style={styles.selectedClientRow}>
              <Text style={styles.selectedClientText}>✓ {selectedClient.full_name}</Text>
              <TouchableOpacity onPress={() => setSelectedClient(null)}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.addClientBtn} onPress={() => { setShowNewClient(!showNewClient); setSelectedClient(null); }}>
            <Text style={styles.addClientBtnText}>+ Adaugă client nou fără cont</Text>
          </TouchableOpacity>
          {showNewClient && (
            <View>
              <TextInput style={styles.input} placeholder="Nume complet" placeholderTextColor={colors.textSecondary} value={newClientName} onChangeText={setNewClientName} />
              <TextInput style={styles.input} placeholder="Telefon" placeholderTextColor={colors.textSecondary} value={newClientPhone} onChangeText={setNewClientPhone} keyboardType="phone-pad" />
            </View>
          )}
          <TouchableOpacity style={[styles.btnConfirm, { marginTop: 12 }, !selectedClient && !showNewClient && styles.btnDisabled]} onPress={handleManualBooking} disabled={!selectedClient && !showNewClient}>
            <Text style={styles.btnConfirmText}>Confirmă programarea</Text>
          </TouchableOpacity>
        </View>
      )}

      {modal === 'blocked' && selectedBooking && (
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalName}>🔒 Interval blocat</Text>
              <Text style={styles.modalTime}>{selectedBooking.start_time?.slice(0, 5)} - {selectedBooking.end_time?.slice(0, 5)}</Text>
              {selectedBooking.reason && <Text style={styles.modalStatus}>{selectedBooking.reason}</Text>}
            </View>
            <TouchableOpacity onPress={() => { setModal(null); setSelectedCell(null); }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.btnCancel} onPress={() => handleDeleteBlock(selectedBooking.id)}>
            <Text style={styles.btnCancelText}>Șterge blocarea</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  return isMobile ? renderMobileView() : renderDesktopView();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  navBtn: { fontSize: 22, color: colors.primary, paddingHorizontal: 8 },
  weekLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  daysHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 },
  dayHeaderCol: { alignItems: 'center', paddingBottom: 4 },
  dayHeaderName: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  dayHeaderCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dayHeaderCircleToday: { backgroundColor: colors.primary },
  dayHeaderNum: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  dayHeaderNumToday: { color: '#fff' },
  gymLabel: { fontSize: 9, color: colors.primary, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  gridScroll: { flex: 1 },
  hourText: { fontSize: 14, color: colors.textPrimary, paddingLeft: 4, fontWeight: '700', lineHeight: 20 },
  availBlock: { position: 'absolute', left: 1, right: 1, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 2, zIndex: 1 },
  availBlockTime: { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  availBlockGym: { fontSize: 10, color: colors.primary, fontWeight: '500' },
  bookingBlock: { position: 'absolute', left: 1, right: 1, borderRadius: 4, padding: 4, zIndex: 10 },
  bookingConfirmed: { backgroundColor: '#b7f5c4', borderLeftWidth: 3, borderLeftColor: '#2ecc71' },
  bookingPending: { backgroundColor: '#fff3b0', borderLeftWidth: 3, borderLeftColor: '#f1c40f' },
  blockedBlock: { backgroundColor: '#f0f0f0', borderLeftWidth: 3, borderLeftColor: '#999' },
  bookingName: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  bookingTime: { fontSize: 11, color: colors.textSecondary },
  // Mobile
  mobileDaysBar: { paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileDayItem: { alignItems: 'center', marginHorizontal: 8, minWidth: 40 },
  mobileDayName: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  mobileDayNameSelected: { color: colors.primary },
  mobileDayPast: { color: '#ccc' },
  mobileDayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  mobileDayCircleToday: { borderWidth: 2, borderColor: colors.primary },
  mobileDayCircleSelected: { backgroundColor: colors.primary },
  mobileDayNum: { fontSize: 15, color: colors.textPrimary },
  mobileDayNumSelected: { color: '#fff', fontWeight: '800' },
  mobileGrid: { flex: 1 },
  // Modals
  modal: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  modalScroll: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: 550, position: 'absolute', bottom: 0, left: 0, right: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  modalScrollContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  modalTime: { fontSize: 15, color: colors.textSecondary, marginBottom: 2 },
  modalStatus: { fontSize: 14, color: colors.textSecondary },
  closeX: { fontSize: 20, color: colors.textSecondary, padding: 4 },
  modalBtns: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btnConfirm: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnCancel: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  btnProfile: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnProfileText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  btnDisabled: { backgroundColor: colors.border },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, marginTop: 4, backgroundColor: colors.surface, color: colors.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 8 },
  clientRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: colors.surface },
  clientRowSelected: { borderColor: colors.primary, backgroundColor: '#F0FDFA' },
  clientName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  clientPhone: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  dateTimeRow: { flexDirection: 'row', marginBottom: 16 },
  addClientBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  addClientBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  selectedClientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDFA', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.primary },
  selectedClientText: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
});