import { createClient } from '@supabase/supabase-js';

// Public browser configuration. These values are safe for the frontend because
// database access is protected by Supabase Auth and Row Level Security (RLS).
// Vercel environment variables override the fallback values below.
const url = (
  import.meta.env.VITE_SUPABASE_URL ||
  'https://vxwlzfidbcdzdusenxns.supabase.co'
).trim();

const anonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_lufszmzag1-zfj1rdn3ByA__mO7T9jQ'
).trim();

if (!url || !anonKey) {
  throw new Error('Configuração pública do Supabase não encontrada.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
