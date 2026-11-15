/**
 * Runtime configuration. Only public values belong here: the Supabase URL and
 * its publishable (anon) key are designed to ship in the app; data is protected
 * by Row Level Security, not by hiding the key. Never put a service role key
 * in an EXPO_PUBLIC_ variable.
 */
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Force demo mode even when Supabase is configured (useful for store reviewers or offline demos). */
  forceDemo: process.env.EXPO_PUBLIC_FORCE_DEMO === '1',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://beatlink.app/privacy',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://beatlink.app/terms',
  /** Deep link scheme, must match app.json "scheme". */
  scheme: 'beatlink',
};

export const isSupabaseConfigured = !!config.supabaseUrl && !!config.supabaseAnonKey && !config.forceDemo;
