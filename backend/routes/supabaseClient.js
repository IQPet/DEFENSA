import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // o la key que uses

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
