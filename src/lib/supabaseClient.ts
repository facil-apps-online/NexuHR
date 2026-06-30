import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const CORE_SUPABASE_URL = import.meta.env.VITE_CORE_SUPABASE_URL;
const CORE_SUPABASE_ANON_KEY = import.meta.env.VITE_CORE_SUPABASE_ANON_KEY;

// Client para la base de datos propia de NexuHR (por tenant)
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Client para la base de datos Core centralizada del ecosistema FacilApps
export const coreSupabase = createClient(CORE_SUPABASE_URL, CORE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // El Core no gestiona sesiones de usuario directamente
    autoRefreshToken: false,
  },
});

// Asegurar que supabase.global y supabase.global.headers existan
if (!supabase.global) {
  (supabase as any).global = {};
}
if (!(supabase as any).global.headers) {
  (supabase as any).global.headers = {};
}

// Sincronizar headers del Core con los del cliente principal
if (!coreSupabase.global) {
  (coreSupabase as any).global = {};
}
(coreSupabase as any).global.headers = (supabase as any).global.headers;
