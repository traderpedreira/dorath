create table if not exists public.dorath_games (
  id uuid primary key,
  mother_code text not null unique,
  room_codes text[] not null,
  revision integer not null default 0,
  state jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists dorath_games_room_codes_idx on public.dorath_games using gin(room_codes);
create table if not exists public.dorath_sessions (
  token_hash text primary key,
  game_id uuid not null references public.dorath_games(id) on delete cascade,
  player_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists dorath_sessions_game_idx on public.dorath_sessions(game_id);
create index if not exists dorath_sessions_user_idx on public.dorath_sessions(user_id);
alter table public.dorath_games enable row level security;
alter table public.dorath_sessions enable row level security;
revoke all on public.dorath_games, public.dorath_sessions from anon, authenticated;

create or replace function public.dorath_create(
  p_id uuid, p_mother_code text, p_room_codes text[], p_state jsonb,
  p_token_hash text, p_player_id uuid, p_user_id uuid
) returns void language plpgsql set search_path = '' as $$
begin
  insert into public.dorath_games(id,mother_code,room_codes,state)
    values(p_id,p_mother_code,p_room_codes,p_state);
  insert into public.dorath_sessions(token_hash,game_id,player_id,user_id)
    values(p_token_hash,p_id,p_player_id,p_user_id);
end $$;

create or replace function public.dorath_join(
  p_id uuid, p_expected_revision integer, p_room_codes text[], p_state jsonb,
  p_token_hash text, p_player_id uuid, p_user_id uuid
) returns boolean language plpgsql set search_path = '' as $$
begin
  update public.dorath_games set state=p_state, room_codes=p_room_codes,
    revision=revision+1
  where id=p_id and revision=p_expected_revision;
  if not found then return false; end if;
  insert into public.dorath_sessions(token_hash,game_id,player_id,user_id)
    values(p_token_hash,p_id,p_player_id,p_user_id);
  return true;
end $$;

create or replace function public.dorath_commit(
  p_id uuid, p_expected_revision integer, p_room_codes text[], p_state jsonb
) returns boolean language plpgsql set search_path = '' as $$
begin
  update public.dorath_games set state=p_state, room_codes=p_room_codes,
    revision=revision+1
  where id=p_id and revision=p_expected_revision;
  return found;
end $$;

revoke all on function public.dorath_create(uuid,text,text[],jsonb,text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.dorath_join(uuid,integer,text[],jsonb,text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.dorath_commit(uuid,integer,text[],jsonb) from public, anon, authenticated;
grant execute on function public.dorath_create(uuid,text,text[],jsonb,text,uuid,uuid) to service_role;
grant execute on function public.dorath_join(uuid,integer,text[],jsonb,text,uuid,uuid) to service_role;
grant execute on function public.dorath_commit(uuid,integer,text[],jsonb) to service_role;
