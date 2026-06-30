// Este archivo re-exporta el cliente Supabase desde lib/supabaseClient.
// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
import { supabase } from '@/lib/supabaseClient';
import type { Database } from './types';

export { supabase };
export type { Database };