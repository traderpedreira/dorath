import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
export const accountTokenKey = userId => `dorath.p1.token.${userId}`;

// O login controla a tela; a Edge Function verifica novamente o JWT a cada ação.
export async function validSession() {
  // A verificação inicial não deve depender de getUser(), que exige rede
  // e pode manter a tela em "Conectando" durante falhas de autenticação.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session;
  if (!session?.access_token || !session.user || session.user.is_anonymous) return null;
  return { user: session.user, accessToken: session.access_token };
}
