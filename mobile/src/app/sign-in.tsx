import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Header, Screen } from '../components/ui/Layout';
import { PressableScale } from '../components/ui/PressableScale';
import { Text } from '../components/ui/Text';
import { Toggle } from '../components/ui/Toggle';
import { backend } from '../data';
import { useT } from '../i18n';
import { errorMessage } from '../state/toast';
import { space } from '../theme/tokens';

export default function SignIn() {
  const t = useT();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('errors.invalid_email'));
    if (password.length < 8) return setError(t('errors.weak_password'));
    if (mode === 'signUp' && !terms) return setError(t('errors.terms_required'));
    setBusy(true);
    try {
      if (mode === 'signUp') {
        const { needsConfirmation } = await backend.signUpWithEmail(email, password);
        if (needsConfirmation) {
          setInfo(t('auth.checkEmail', { email: email.trim() }));
          setMode('signIn');
        }
      } else {
        await backend.signInWithEmail(email, password);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.body}>
          <Text variant="display" accessibilityRole="header">
            {mode === 'signUp' ? t('auth.signUpTitle') : t('auth.signInTitle')}
          </Text>
          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            testID="auth-email"
          />
          <Field
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
            hint={mode === 'signUp' ? t('auth.passwordHint') : undefined}
            onSubmitEditing={() => void submit()}
            testID="auth-password"
          />
          {mode === 'signUp' ? (
            <View style={styles.checks}>
              <Toggle label={t('auth.acceptTerms')} value={terms} onChange={setTerms} testID="auth-terms" />
            </View>
          ) : null}
          {error ? (
            <Text variant="label" tone="clip" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {info ? (
            <Text variant="label" tone="signal" accessibilityRole="alert">
              {info}
            </Text>
          ) : null}
          <Button label={mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')} full loading={busy} onPress={() => void submit()} testID="auth-submit" />
          <PressableScale onPress={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')} style={styles.switch} accessibilityRole="button">
            <Text variant="label" tone="mist" align="center">
              {mode === 'signUp' ? t('auth.toSignIn') : t('auth.toSignUp')}
            </Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.lg },
  checks: { gap: space.sm },
  switch: { paddingVertical: space.md },
});
