import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../state/session';
import { colors } from '../theme/tokens';

/**
 * OAuth and email-confirmation redirects land here. On the web, Supabase reads
 * the code from the URL (detectSessionInUrl); on native, the auth session
 * returns to the app before this screen matters.
 */
export default function AuthCallback() {
  const session = useSession((s) => s.session);
  if (session) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.booth, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.signal} />
    </View>
  );
}
