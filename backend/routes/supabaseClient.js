import { createClient } from '@supabase/supabase-js';
import { Agent, fetch } from 'undici'; // ← Aquí agregamos `fetch`

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// ⚠️ Forzar IPv4
const ipv4Agent = new Agent({
  connect: {
    family: 4,
    timeout: 60_000
  }
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, dispatcher: ipv4Agent }),
  }
});

export default supabase;


