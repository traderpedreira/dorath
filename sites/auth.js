import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
export const accountTokenKey = userId => `dorath.p1.token.${userId}`;

// O login controla a tela; a Edge Function verifica novamente o JWT a cada ação.
export async function validSession() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { user, accessToken: session.access_token };
}
