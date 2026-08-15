import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, TextInput } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const DURATIONS = [30, 45, 60, 90, 120];

function isValidTime(time) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

export default function CoachAvailabilityScreen({ navigation }) {
  const [gyms, setGyms] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [sessionType, setSessionType] = useState('one_to_one');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [viewDay, setViewDay] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user.id);

      const { data: coachData } = await supabase
        .from('coaches')
        .select('gym_ids')
        .eq('id', user.id)
        .maybeSingle();

      if (coachData?.gym_ids && coachData.gym_ids.length > 0) {
        const { data: gymData } = await supabase
          .from('gyms')
          .select('*')
          .in('id', coachData.gym_ids)
          .order('name');
        if (gymData) setGyms(gymData);
      }

      const { data: slotData } = await supabase
        .from('availability')
        .select('*, gyms(name)')
        .eq('coach_id', user.id)
        .order('day_of_week');
      if (slotData) setSlots(slotData);
    }
    load();
  }, []);

  function toggleDay(index) {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter(d => d !== index));
    } else {
      setSelectedDays([...selectedDays, index]);
    }
  }

  function getFinalDuration() {
    if (useCustomDuration) {
      const val = parseInt(customDuration);
      if (!val || val < 5 || val % 5 !== 0) return null;
      return val;
    }
    return duration;
  }

  async function handleAdd() {
    if (selectedDays.length === 0) { Alert.alert('Eroare', 'Alege cel puțin o zi.'); return; }
    if (!selectedGym) { Alert.alert('Eroare', 'Alege o sală.'); return; }
    if (!isValidTime(startTime)) { Alert.alert('Eroare', 'Ora de început nu e validă.'); return; }
    if (!isValidTime(endTime)) { Alert.alert('Eroare', 'Ora de sfârșit nu e validă.'); return; }
    if (startTime >= endTime) { Alert.alert('Eroare', 'Ora de sfârșit trebuie să fie după ora de început.'); return; }
    const finalDuration = getFinalDuration();
    if (!finalDuration) { Alert.alert('Eroare', 'Durata trebuie să fie un multiplu de 5 minute.'); return; }
    if (!price || parseFloat(price) <= 0) { Alert.alert('Eroare', 'Introdu prețul per sesiune.'); return; }
    if (sessionType === 'group' && (!maxParticipants || parseInt(maxParticipants) < 2)) {
      Alert.alert('Eroare', 'Numărul maxim de participanți trebuie să fie cel puțin 2.');
      return;
    }

    setLoading(true);

    const inserts = selectedDays.map(day => ({
      coach_id: userId,
      gym_id: selectedGym,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: finalDuration,
      session_type: sessionType,
      max_participants: sessionType === 'group' ? parseInt(maxParticipants) : 1,
      price: parseFloat(price),
    }));

    const { data, error } = await supabase
      .from('availability')
      .insert(inserts)
      .select('*, gyms(name)');

    setLoading(false);

    if (error) {
      Alert.alert('Eroare', error.message);
    } else {
      setSlots([...slots, ...data]);
      setSelectedDays([]);
    }
  }

  async function handleDelete(slotId) {
    const { error } = await supabase.from('availability').delete().eq('id', slotId);
    if (!error) setSlots(slots.filter(s => s.id !== slotId));
  }

  const slotsForDay = slots.filter(s => s.day_of_week === viewDay);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('CoachHome')}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Disponibilitate</Text>
          <Text style={styles.subtitle}>Setează programul tău săptămânal</Text>
        </View>

        {/* Zile - selectare multipla */}
        <Text style={styles.label}>Zilele active <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(poți selecta mai multe)</Text></Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.chip, selectedDays.includes(index) && styles.chipSelected]}
              onPress={() => toggleDay(index)}
            >
              <Text style={[styles.chipText, selectedDays.includes(index) && styles.chipTextSelected]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sala */}
        <Text style={styles.label}>Sala</Text>
        {gyms.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 8 }}>
            Adaugă săli în profilul tău mai întâi.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {gyms.map(gym => (
              <TouchableOpacity
                key={gym.id}
                style={[styles.chip, selectedGym === gym.id && styles.chipSelected]}
                onPress={() => setSelectedGym(gym.id)}
              >
                <Text style={[styles.chipText, selectedGym === gym.id && styles.chipTextSelected]}>{gym.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Ora start */}
        <Text style={styles.label}>Ora de început</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {HOURS.map(hour => (
            <TouchableOpacity
              key={hour}
              style={[styles.chip, startTime === hour && styles.chipSelected]}
              onPress={() => setStartTime(hour)}
            >
              <Text style={[styles.chipText, startTime === hour && styles.chipTextSelected]}>{hour}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Sau scrie manual: ex 08:45"
          placeholderTextColor={colors.textSecondary}
          value={HOURS.includes(startTime) ? '' : startTime}
          onChangeText={text => setStartTime(text)}
          keyboardType="numbers-and-punctuation"
        />

        {/* Ora sfarsit */}
        <Text style={styles.label}>Ora de sfârșit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {HOURS.map(hour => (
            <TouchableOpacity
              key={hour}
              style={[styles.chip, endTime === hour && styles.chipSelected]}
              onPress={() => setEndTime(hour)}
            >
              <Text style={[styles.chipText, endTime === hour && styles.chipTextSelected]}>{hour}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.input}
          placeholder="Sau scrie manual: ex 09:45"
          placeholderTextColor={colors.textSecondary}
          value={HOURS.includes(endTime) ? '' : endTime}
          onChangeText={text => setEndTime(text)}
          keyboardType="numbers-and-punctuation"
        />

        {/* Tip sesiune */}
        <Text style={styles.label}>Tip sesiune</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, sessionType === 'one_to_one' && styles.toggleBtnSelected]}
            onPress={() => setSessionType('one_to_one')}
          >
            <Text style={[styles.toggleText, sessionType === 'one_to_one' && styles.toggleTextSelected]}>👤 One to One</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, sessionType === 'group' && styles.toggleBtnSelected]}
            onPress={() => setSessionType('group')}
          >
            <Text style={[styles.toggleText, sessionType === 'group' && styles.toggleTextSelected]}>👥 Grup</Text>
          </TouchableOpacity>
        </View>

        {sessionType === 'group' && (
          <>
            <Text style={styles.label}>Număr maxim participanți</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 10"
              placeholderTextColor={colors.textSecondary}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="numeric"
            />
          </>
        )}

        {/* Durata */}
        <Text style={styles.label}>Durata unei sesiuni</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {DURATIONS.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, !useCustomDuration && duration === d && styles.chipSelected]}
              onPress={() => { setDuration(d); setUseCustomDuration(false); }}
            >
              <Text style={[styles.chipText, !useCustomDuration && duration === d && styles.chipTextSelected]}>{d} min</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, useCustomDuration && styles.chipSelected]}
            onPress={() => setUseCustomDuration(true)}
          >
            <Text style={[styles.chipText, useCustomDuration && styles.chipTextSelected]}>Manual</Text>
          </TouchableOpacity>
        </ScrollView>

        {useCustomDuration && (
          <TextInput
            style={styles.input}
            placeholder="Durată în minute (multiplu de 5, ex: 75)"
            placeholderTextColor={colors.textSecondary}
            value={customDuration}
            onChangeText={setCustomDuration}
            keyboardType="numeric"
          />
        )}

        {/* Pret */}
        <Text style={styles.label}>Preț per sesiune (lei)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 150"
          placeholderTextColor={colors.textSecondary}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAdd} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Se adaugă...' : '+ Adaugă interval'}</Text>
        </TouchableOpacity>

        {/* Vizualizare intervale pe zile */}
        <Text style={styles.sectionTitle}>Vizualizează intervalele</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.chip, viewDay === index && styles.chipSelected]}
              onPress={() => setViewDay(index)}
            >
              <Text style={[styles.chipText, viewDay === index && styles.chipTextSelected]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {slotsForDay.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Niciun interval pentru {DAYS[viewDay]}.</Text>
          </View>
        ) : (
          slotsForDay.map(slot => (
            <View key={slot.id} style={styles.slotCard}>
              <View>
                <Text style={styles.slotTime}>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</Text>
                <Text style={styles.slotGym}>{slot.gyms?.name}</Text>
                <Text style={styles.slotMeta}>
                  {slot.duration_minutes} min · {slot.session_type === 'group' ? `👥 Grup (max ${slot.max_participants})` : '👤 One to One'} · {slot.price} lei
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(slot.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Șterge</Text>
              </TouchableOpacity>
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
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8, marginTop: 20 },
  chipsRow: { marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: colors.surface },
  toggleBtnSelected: { borderColor: colors.primary, backgroundColor: '#F0FDFA' },
  toggleText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  toggleTextSelected: { color: colors.primary },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: 28, marginBottom: 14 },
  emptyContainer: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  slotCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  slotTime: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  slotGym: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  slotMeta: { fontSize: 12, color: colors.primary },
  deleteBtn: { padding: 8 },
  deleteBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
});