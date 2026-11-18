import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return (import.meta.env[key] as string);
  }
  return '';
};

const DEFAULT_SUPABASE_URL = 'https://dzgegvueamcmjgxinrnj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Z2VndnVlYW1jbWpneGlucm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MzgzNDEsImV4cCI6MjEwMDIxNDM0MX0.kvOEN7Kkh17aGcRIjXh_pvo9yCdapuhuZZdXpX5sEvQ';

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

if (!getEnvVar('VITE_SUPABASE_URL') || !getEnvVar('VITE_SUPABASE_ANON_KEY')) {
  console.warn('Supabase URL or Anon Key is missing from env; falling back to default configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
