import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';

/** Reads URLs and keys of the local stack (`supabase start`). Never used against production. */
function localStack() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      anon: process.env.SUPABASE_ANON_KEY,
      service: process.env.SUPABASE_SERVICE_ROLE_KEY,
      db: process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    };
  }
  const out = execSync('npx supabase status -o json', { cwd: new URL('../..', import.meta.url).pathname }).toString();
  const json = JSON.parse(out.slice(out.indexOf('{')));
  return { url: json.API_URL, anon: json.ANON_KEY, service: json.SERVICE_ROLE_KEY, db: json.DB_URL };
}

export const stack = localStack();

export const admin = createClient(stack.url, stack.service, { auth: { persistSession: false } });
export const anon = createClient(stack.url, stack.anon, { auth: { persistSession: false } });

export function dbClient() {
  return new pg.Client({ connectionString: stack.db });
}

const run = Date.now().toString(36);

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

export async function createUser(label: string): Promise<TestUser> {
  const email = `${label}.${run}@beatlink.test`;
  const password = 'test-password-123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(stack.url, stack.anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, email, client };
}

export const baseProfile = {
  languages: ['fr', 'en'],
  availability: 'available',
  collab_mode: 'both',
  influences: [] as string[],
  skills: [] as string[],
  goals: [] as string[],
};

export async function onboard(user: TestUser, fields: Record<string, unknown>) {
  const { data, error } = await user.client
    .from('profiles')
    .upsert({
      id: user.id,
      handle: `${String(fields.display_name ?? 'u').toLowerCase().replace(/[^a-z0-9]/g, '')}${run}`.slice(0, 24),
      ...baseProfile,
      ...fields,
      age_confirmed_at: new Date().toISOString(),
      onboarded_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function expectPgError(error: { message?: string } | null, code: string) {
  if (!error) throw new Error(`expected error "${code}" but call succeeded`);
  if (!String(error.message).includes(code)) throw new Error(`expected "${code}", got "${error.message}"`);
}
