import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

export default function ResetPasswordScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    async function handleToken() {
      if (typeof window !== 'undefined') {
        const fullUrl = window.location.href;
        const hashIndex = fullUrl.indexOf('#');
        if (hashIndex !== -1) {
          const hash = fullUrl.substring(hashIndex + 1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');
          if (accessToken && refreshToken && type === 'recovery') {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error && !error.message.includes('future')) {
              setError('Link invalid sau expirat. Solicită un link nou.');
            } else {
              setSessionReady(true);
            }
          } else {
            setError('Link invalid sau expirat. Solicită un link nou.');
          }
        }
      }
    }
    handleToken();
  }, []);

  async function handleReset() {
    if (!password || !confirmPassword) {
      setError('Completează ambele câmpuri.');
      return;
    }
    if (password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>S</Text>
          </View>
          <Text style={styles.logoText}>Setto Pro</Text>
        </View>

        {!success ? (
          <>
            <Text style={styles.title}>Parolă nouă</Text>
            <Text style={styles.subtitle}>Introdu noua ta parolă.</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {sessionReady && (
              <>
                <Text style={styles.inputLabel}>Parolă nouă</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minim 6 caractere"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <Text style={styles.inputLabel}>Confirmă parola</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Repetă parola"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  onSubmitEditing={handleReset}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleReset}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>{loading ? 'Se salvează...' : 'Salvează parola nouă'}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Parolă schimbată!</Text>
            <Text style={styles.successText}>Parola ta a fost schimbată cu succes. Te poți loga acum cu noua parolă.</Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.buttonText}>Mergi la login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoIconText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  logoText: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successIcon: { fontSize: 64, marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  successText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});