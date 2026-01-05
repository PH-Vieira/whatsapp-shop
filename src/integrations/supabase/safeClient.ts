import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallback values are safe for client-side usage (URL + publishable/anon key)
const FALLBACK_URL = 'https://ndmesywylvqakutkicmj.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbWVzeXd5bHZxYWt1dGtpY21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NjI3NjIsImV4cCI6MjA4MzEzODc2Mn0.Iy-38wscsXP1znDbcZ74YGxaFmJXZEf4RxzMFbLr8Mg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
