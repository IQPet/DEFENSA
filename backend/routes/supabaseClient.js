import { createClient } from '@supabase/supabase-js';
import { Agent, fetch as undiciFetch } from 'undici'; // renombramos fetch para evitar confusión

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_KEY:', supabaseKey ? '*****' : 'NO DEFINIDO');

// ⚠️ Forzar uso de IPv4
const ipv4Agent = new Agent({
  connect: {
    family: 4,
    timeout: 60_000,
  },
});

// 🚀 Usamos `undiciFetch` con agente IPv4
const fetchWithIPv4 = (url, options = {}) => {
  return undiciFetch(url, { ...options, dispatcher: ipv4Agent });
};

// 🧠 Crear cliente Supabase con fetch personalizado
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithIPv4,
  },
});

export default supabase;
