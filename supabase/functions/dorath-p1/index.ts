import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
import { newPlayer, publicView, applyAction, log, code } from './engine.js';

const url = Deno.env.get('SUPABASE_URL')!;
const secret = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default
  || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !secret) throw Error('Credenciais do Supabase ausentes');
const db = createClient(url, secret, { auth: { persistSession: false } });
// A função valida o JWT com o Auth antes de usar a chave de serviço.
const origin = Deno.env.get('DORATH_ALLOWED_ORIGIN') || '*';
const cors = { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, apikey', 'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const fail = (message: string, status = 400): never => { throw Object.assign(new Error(message), { status }); };
function result(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors }); }
function check(error: { message: string; code?: string } | null) {
  if (error) { console.error('Database error', error); fail('Falha ao acessar a partida', 500); }
}
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
function rooms(g: any) { return g.rooms.map((r: any) => r.code); }
async function session(value: unknown, userId: string) {
  if (typeof value !== 'string' || !/^[0-9a-f]{48}$/.test(value)) fail('Sessão inválida', 401);
  const { data: s, error: se } = await db.from('dorath_sessions').select('game_id,player_id,user_id').eq('token_hash', await hash(value)).maybeSingle();
  check(se); if (!s) fail('Sessão inválida', 401);
  if (s.user_id !== userId) fail('Esta sessão pertence a outra conta', 403);
  const { data: row, error: ge } = await db.from('dorath_games').select('id,revision,state').eq('id', s.game_id).maybeSingle();
  check(ge); if (!row) fail('Partida não encontrada', 404);
  const g = row.state; g.revision = row.revision;
  if (g.engineVersion !== 'P1-MASTER-v1.2') fail('Partida de uma build anterior; inicie uma nova partida', 409);
  const p = g.players.find((x: any) => x.id === s.player_id);
  if (!p) fail('Jogador não encontrado', 401);
  return { row, g, p };
}
async function create(a: any, userId: string) {
  const id = crypto.randomUUID(), motherCode = code(), roomCode = code();
  const player = newPlayer(a.name, roomCode, a.team, a.secretHistory, a.commonHistory);
  const g = { id, engineVersion: 'P1-MASTER-v1.2', motherCode, hostPlayerId: player.id, rooms: [{ code: roomCode, name: 'Sala 1', team: a.team || '' }],
    players: [player], phase: 'lobby', round: 1, turnIndex: 0, globalStates: {}, violence: 0,
    marcos: {}, arkOpened: false, preparationClosed: false, rupturesResolved: {}, pendingRupture: null,
    activeThreats: [], seenThreats: [], lastSpawnRound: 0, trades: [], history: [], revision: 0,
    pendingConsequencePlayers: [], pendingThreat: null, marcoQueue: [], finalScores: null };
  log(g, 'partida', 'Partida-Mãe criada');
  const t = token();
  const { error } = await db.rpc('dorath_create', { p_id: id, p_mother_code: motherCode,
    p_room_codes: rooms(g), p_state: g, p_token_hash: await hash(t), p_player_id: player.id, p_user_id: userId });
  check(error);
  return { token: t, motherCode, roomCode, playerId: player.id };
}
async function join(a: any, userId: string) {
  const codeText = String(a.code || '').trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(codeText)) fail('Código da sala inválido');
  const { data: byMother, error: me } = await db.from('dorath_games').select('id,revision,state')
    .eq('mother_code', codeText).maybeSingle();
  check(me);
  let row = byMother;
  if (!row) {
    const { data: byRoom, error: re } = await db.from('dorath_games').select('id,revision,state')
      .contains('room_codes', [codeText]).limit(1);
    check(re); row = byRoom?.[0];
  }
  if (!row) fail('Sala ou Partida-Mãe não encontrada', 404);
  const g = row.state;
  if (g.engineVersion !== 'P1-MASTER-v1.2') fail('Partida de uma build anterior; inicie uma nova partida', 409);
  if (g.phase !== 'lobby') fail('Esta partida já começou');
  const room = g.rooms.find((r: any) => r.code === codeText) || g.rooms[0];
  if (g.players.filter((p: any) => p.room === room.code).length >= 8) fail('Limite de oito jogadores na sala');
  const p = newPlayer(a.name, room.code, a.team || room.team, a.secretHistory, a.commonHistory);
  g.players.push(p); log(g, 'entrada', `${p.name} entrou em ${room.name}`);
  const t = token();
  const { data: ok, error } = await db.rpc('dorath_join', { p_id: row.id,
    p_expected_revision: row.revision, p_room_codes: rooms(g), p_state: g,
    p_token_hash: await hash(t), p_player_id: p.id, p_user_id: userId });
  check(error); if (!ok) fail('Conflito: atualize a partida e tente novamente', 409);
  return { token: t, motherCode: g.motherCode, roomCode: room.code, playerId: p.id };
}
async function action(a: any, userId: string) {
  const { row, g, p } = await session(a.token, userId);
  if (Number(a.expectedRevision) !== row.revision) fail('Estado mudou; atualize antes de agir', 409);
  applyAction(g, p, a);
  const { data: ok, error } = await db.rpc('dorath_commit', { p_id: row.id,
    p_expected_revision: row.revision, p_room_codes: rooms(g), p_state: g });
  check(error); if (!ok) fail('Conflito de versão; tente novamente', 409);
  g.revision = row.revision + 1;
  return publicView(g, p);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return result({ error: 'Método indisponível' }, 405);
  try {
    if (Number(req.headers.get('content-length') || 0) > 32000) fail('Pedido muito grande', 413);
    const bearer = req.headers.get('authorization') || '';
    if (!/^Bearer\s+\S+$/i.test(bearer)) fail('Entre na sua conta para continuar', 401);
    const { data: { user }, error: authError } = await db.auth.getUser(bearer.replace(/^Bearer\s+/i, ''));
    if (authError || !user || user.is_anonymous) fail('Conta inválida ou sessão expirada', 401);
    const a = await req.json();
    switch (a.route) {
      case 'create': return result(await create(a, user.id));
      case 'join': return result(await join(a, user.id));
      case 'state': { const { g, p } = await session(a.token, user.id); return result(publicView(g, p)); }
      case 'action': return result(await action(a, user.id));
      default: return result({ error: 'Rota não encontrada' }, 404);
    }
  } catch (e) {
    const status = e instanceof SyntaxError ? 400 : (e as any).status || 500;
    if (status >= 500) console.error(e);
    return result({ error: status >= 500 ? 'Erro interno da partida' : (e as Error).message }, status);
  }
});
