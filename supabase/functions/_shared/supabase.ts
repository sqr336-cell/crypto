/**
 * Minimal, dependency-free Supabase REST client for Edge Functions
 * (service role). Avoids pulling supabase-js from npm at cold start.
 */
import { requireEnv } from './http.ts';

const url = () => requireEnv('SUPABASE_URL');
const serviceKey = () => requireEnv('SUPABASE_SERVICE_ROLE_KEY');

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const key = serviceKey();
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

async function check(res: Response, what: string): Promise<Response> {
  if (!res.ok) throw new Error(`${what} failed (${res.status}): ${await res.text()}`);
  return res;
}

/** Returns the user behind an access token, or null when the token is invalid. */
export async function getUser(accessToken: string): Promise<{ id: string; email?: string } | null> {
  const res = await fetch(`${url()}/auth/v1/user`, { headers: { apikey: serviceKey(), Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  return await res.json();
}

export async function deleteUser(id: string): Promise<void> {
  await check(await fetch(`${url()}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: headers() }), 'delete user');
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await check(await fetch(`${url()}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(args) }), `rpc ${fn}`);
  return await res.json();
}

/** GET on a table with a PostgREST query string, e.g. `push_tokens?profile_id=in.(…)`. */
export async function select<T>(query: string): Promise<T[]> {
  const res = await check(await fetch(`${url()}/rest/v1/${query}`, { headers: headers() }), `select ${query}`);
  return await res.json();
}

export async function remove(query: string): Promise<void> {
  await check(await fetch(`${url()}/rest/v1/${query}`, { method: 'DELETE', headers: headers() }), `delete ${query}`);
}

export async function removeObjects(bucket: string, names: string[]): Promise<void> {
  await check(
    await fetch(`${url()}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: headers(), body: JSON.stringify({ prefixes: names }) }),
    `remove ${bucket} objects`,
  );
}

/** Quotes values for PostgREST `in.(…)` filters. */
export function inList(values: string[]): string {
  return `(${values.map((v) => `"${v.replace(/"/g, '')}"`).join(',')})`;
}
