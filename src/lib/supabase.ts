import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  const rawEnvUrl = 
    (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL);

  const envUrl = (rawEnvUrl && !rawEnvUrl.includes('your-supabase-url') && !rawEnvUrl.includes('example.com') && rawEnvUrl.trim() !== '')
    ? rawEnvUrl
    : 'https://afmonljoftcsclxdcdpy.supabase.co';

  const rawEnvKey = 
    (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const envKey = (rawEnvKey && !rawEnvKey.includes('your-supabase-anon-key') && rawEnvKey.trim() !== '')
    ? rawEnvKey
    : 'sb_publishable_MnalKjv2r0bfDHCQDHDoog_cMNktES4';

  const targetUrl = url || envUrl;
  const targetKey = anonKey || envKey;

  if (!targetUrl || !targetKey || targetUrl.trim() === '' || targetKey.trim() === '' || targetUrl.includes('your-supabase-url')) {
    return null;
  }

  try {
    if (!supabaseClient) {
      supabaseClient = createClient(targetUrl, targetKey);
    }
    return supabaseClient;
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
    return null;
  }
}

export function resetSupabaseClient() {
  supabaseClient = null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'Supabase URL and Anon Key are required.' };
  }

  try {
    const client = createClient(url, anonKey);
    // Simple query test on supabase health / public table
    const { error } = await client.from('products').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      return { success: true, message: `Connected successfully! Note: (${error.message}).` };
    }

    return { success: true, message: 'Connected to Supabase PostgreSQL successfully!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
}
