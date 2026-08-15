import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const SPORTS = ['Fitness', 'Yoga', 'Box', 'Crossfit', 'Înot', 'Tenis', 'Fotbal', 'Baschet', 'Cycling', 'Pilates'];

export default function CoachProfileSetupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [sport, setSport] = useState('');
  const [bio, setBio] = useState('');
  const [gyms, setGyms] = useState([]);
  const [selectedGyms, setSelectedGyms] = useState([]);
  const [gymSearch, setGymSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: gymData } = await supabase.from('gyms').select('*').order('name');
      if (gymData) setGyms(gymData);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (profile?.full_name) setFullName(profile.full_name);

      const { data: coach } = await supabase.from('coaches').select('*').eq('id', user.id).maybeSingle();
      if (coach) {
        if (coach.sport_types?.[0]) setSport(coach.sport_types[0]);
        if (coach.bio) setBio(coach.bio);
        if (coach.gym_ids) setSelectedGyms(coach.gym_ids);
      }
    }
    load();
  }, []);

  function toggleGym(gymId) {
    if (selectedGyms.includes(gymId)) {
      setSelectedGyms(selectedGyms.filter(id => id !== gymId));
    } else {
      setSelectedGyms([...selectedGyms, gymId]);
    }
  }

  async function handleSave() {
    if (!fullName || !sport) {
      Alert.alert('Eroare', 'Completează numele și sportul.');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);

    const { error: coachError } = await supabase.from('coaches').upsert({
      id: user.id,
      sport_types: [sport],
      bio,
      gym_ids: selectedGyms.length > 0 ? selectedGyms : null,
    }, { onConflict: 'id' });

    setLoading(false);

    if (coachError) {
      Alert.alert('Eroare', coachError.message);
    } else {
      Alert.alert('Succes', 'Profilul tău a fost salvat!', [
        { text: 'OK', onPress: () => navigation.navigate('CoachHome') }
      ]);
    }
  }

  return (
<SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profilul tău</Text>
          <Text style={styles.subtitle}>Completează informațiile pentru clienți</Text>
        </View>

        <Text style={styles.label}>Nume complet</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Alexandru Ionescu"
          placeholderTextColor={colors.textSecondary}
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Sport</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {SPORTS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, sport === s && styles.chipSelected]}
              onPress={() => setSport(s)}
            >
              <Text style={[styles.chipText, sport === s && styles.chipTextSelected]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descrie-te pe scurt..."
          placeholderTextColor={colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Săli unde activezi</Text>
        <TextInput
          style={styles.input}
          placeholder="Caută sala..."
          placeholderTextColor={colors.textSecondary}
          value={gymSearch}
          onChangeText={setGymSearch}
        />

        {selectedGyms.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            {selectedGyms.map(gymId => {
              const gym = gyms.find(g => g.id === gymId);
              return (
                <View key={gymId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDFA', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.primary }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primaryDark }}>{gym?.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{gym?.address}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleGym(gymId)}>
                    <Text style={{ fontSize: 18, color: colors.textSecondary }}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

{gymSearch.length > 0 && (
          <ScrollView style={{ maxHeight: 200, marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, maxHeight: 150 }}>
                      {gyms.filter(g =>
              g.name.toLowerCase().includes(gymSearch.toLowerCase()) &&
              !selectedGyms.includes(g.id)
            ).map(gym => (
              <TouchableOpacity
                key={gym.id}
                style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}
                onPress={() => { toggleGym(gym.id); setGymSearch(''); }}
              >
                <Text style={{ fontSize: 15, color: colors.textPrimary, fontWeight: '500' }}>{gym.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{gym.address}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Se salvează...' : 'Salvează profilul'}</Text>
        </TouchableOpacity>
</ScrollView>
      </KeyboardAvoidingView>
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
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textPrimary },
  textArea: { height: 110, textAlignVertical: 'top' },
  chipsRow: { marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});