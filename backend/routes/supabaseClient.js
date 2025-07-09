import { createClient } from '@supabase/supabase-js';
import { Agent } from 'undici';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// ⚠️ Forzar IPv4 en el agente HTTP de Undici
const ipv4Agent = new Agent({
  connect: {
    family: 4, // ← aquí forzamos IPv4
    timeout: 60_000
  }
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, dispatcher: ipv4Agent }),
  }
});

export default supabase;

