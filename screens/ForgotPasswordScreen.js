import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email) {
      setError('Introdu adresa de email.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://pro.setto.ro/reset-password',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Înapoi</Text>
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>S</Text>
          </View>
          <Text style={styles.logoText}>Setto Pro</Text>
        </View>

        {!sent ? (
          <>
            <Text style={styles.title}>Resetează parola</Text>
            <Text style={styles.subtitle}>Introdu emailul cu care te-ai înregistrat și îți trimitem un link de resetare.</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

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

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Se trimite...' : 'Trimite link de resetare'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.successTitle}>Email trimis!</Text>
            <Text style={styles.successText}>Verifică căsuța de email la adresa <Text style={{ fontWeight: '700' }}>{email}</Text> și urmează linkul pentru a-ți reseta parola.</Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.buttonText}>Înapoi la login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoIconText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  logoText: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textPrimary, marginBottom: 24 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successIcon: { fontSize: 64, marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  successText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});