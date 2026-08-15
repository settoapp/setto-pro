import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!fullName || !email || !password || !phone) {
      setError('Completează toate câmpurile.');
      return;
    }
    if (password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.');
      return;
    }
    if (phone.length < 10) {
      setError('Numărul de telefon nu e valid.');
      return;
    }
    setError('');
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const userId = data.user.id;
    await new Promise(resolve => setTimeout(resolve, 1500));
await supabase
      .from('profiles')
      .upsert({ id: userId, phone, full_name: fullName, role: 'coach' });

    setLoading(false);
navigation.navigate('CoachHome');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>S</Text>
            </View>
            <Text style={styles.logoText}>Setto</Text>
          </View>
          <Text style={styles.title}>Creează cont</Text>
          <Text style={styles.subtitle}>Îți ia mai puțin de un minut</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Nume complet</Text>
          <TextInput
            style={styles.input}
            placeholder="Alexandru Ionescu"
            placeholderTextColor={colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="nume@email.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>Număr de telefon</Text>
          <TextInput
            style={styles.input}
            placeholder="07xx xxx xxx"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Parolă</Text>
          <TextInput
            style={styles.input}
            placeholder="Minim 6 caractere"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onSubmitEditing={handleRegister}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Se creează contul...' : 'Creează cont'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Ai deja cont? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Intră în cont</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 28, paddingBottom: 40 },
  header: { paddingTop: 16, marginBottom: 32 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoIconText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  logoText: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  form: { marginBottom: 24 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});