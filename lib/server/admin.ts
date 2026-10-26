import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

// Supabase client with the SERVICE ROLE key. It can do everything, so it is used
// only inside /app/api routes (never in the browser). Keep the key secret.
let client: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Who is calling? The browser sends its login token as "Authorization: Bearer ...".
export async function userFromRequest(req: Request): Promise<User | null> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
