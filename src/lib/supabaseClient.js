'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton klien browser. Kredensial diambil langsung dari env (.env.local),
// jadi tidak perlu dimasukkan lewat UI.
export const supabase = createClient(url ?? '', anon ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const SUPABASE_URL = url ?? '';

export function configOk() {
  return Boolean(url && anon && !url.includes('xxxxxxxx'));
}
