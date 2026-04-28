import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.warn('SUPABASE_URL veya SUPABASE_KEY eksik.');
}

export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: false }
});
