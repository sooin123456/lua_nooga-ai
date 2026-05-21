create extension if not exists "pgcrypto";

create table if not exists public.judgment_rooms (
  id uuid primary key default gen_random_uuid(),
  access_secret text not null default encode(gen_random_bytes(24), 'hex')
    check (char_length(access_secret) between 32 and 120),
  host_label text not null check (host_label in ('A', 'B')),
  status text not null default 'open' check (status in ('open', 'exploded')),
  result_json jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  expires_at timestamptz not null
);

alter table public.judgment_rooms
  add column if not exists access_secret text;

update public.judgment_rooms
set access_secret = encode(gen_random_bytes(24), 'hex')
where access_secret is null or access_secret = '';

alter table public.judgment_rooms
  alter column access_secret set not null,
  alter column access_secret set default encode(gen_random_bytes(24), 'hex');

alter table public.judgment_rooms
  add column if not exists started_at timestamptz;

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.judgment_rooms(id) on delete cascade,
  role text not null check (role in ('A', 'B', 'spectator')),
  nickname text not null check (char_length(nickname) between 1 and 12),
  client_key text not null check (char_length(client_key) between 12 and 120),
  joined_at timestamptz not null default now()
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.judgment_rooms(id) on delete cascade,
  author text not null check (author in ('A', 'B')),
  nickname text not null default '',
  client_key text not null default '',
  body text not null check (char_length(body) between 1 and 800),
  created_at timestamptz not null default now()
);

alter table public.room_messages
  add column if not exists nickname text not null default '',
  add column if not exists client_key text not null default '';

create index if not exists room_messages_room_created_idx
  on public.room_messages(room_id, created_at);

create index if not exists room_participants_room_joined_idx
  on public.room_participants(room_id, joined_at);

create unique index if not exists room_participants_room_client_key_idx
  on public.room_participants(room_id, client_key);

create unique index if not exists room_participants_two_party_roles_idx
  on public.room_participants(room_id, role)
  where role in ('A', 'B');

create table if not exists public.judgment_results (
  id uuid primary key default gen_random_uuid(),
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create table if not exists public.result_comments (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.judgment_results(id) on delete cascade,
  body text not null check (
    char_length(body) between 1 and 120
    and body !~* '([0-9]{2,4}[- .]?[0-9]{3,4}[- .]?[0-9]{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})'
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.result_likes (
  result_id uuid not null references public.judgment_results(id) on delete cascade,
  client_key text not null check (char_length(client_key) between 12 and 120),
  created_at timestamptz not null default now(),
  primary key (result_id, client_key)
);

create table if not exists public.anonymous_users (
  anonymous_user_key text primary key,
  created_at timestamptz not null default now(),
  blocked_at timestamptz
);

create table if not exists public.daily_ai_usage (
  anonymous_user_key text not null references public.anonymous_users(anonymous_user_key) on delete cascade,
  usage_date date not null,
  free_uses integer not null default 0,
  share_bonus_uses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (anonymous_user_key, usage_date)
);

create index if not exists result_comments_result_created_idx
  on public.result_comments(result_id, created_at desc);

alter table public.judgment_rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_messages enable row level security;
alter table public.judgment_results enable row level security;
alter table public.result_comments enable row level security;
alter table public.result_likes enable row level security;
alter table public.anonymous_users enable row level security;
alter table public.daily_ai_usage enable row level security;

revoke all on public.judgment_rooms from anon, authenticated;
revoke all on public.room_participants from anon, authenticated;
revoke all on public.room_messages from anon, authenticated;
revoke all on public.judgment_results from anon, authenticated;
revoke all on public.result_comments from anon, authenticated;
revoke all on public.result_likes from anon, authenticated;
revoke all on public.anonymous_users from anon, authenticated;
revoke all on public.daily_ai_usage from anon, authenticated;

grant usage on schema public to anon, authenticated;

drop policy if exists "public can create ephemeral rooms" on public.judgment_rooms;
drop policy if exists "public can read rooms by link" on public.judgment_rooms;
drop policy if exists "public can explode open rooms" on public.judgment_rooms;
drop policy if exists "public can read room participants" on public.room_participants;
drop policy if exists "public can join active rooms" on public.room_participants;
drop policy if exists "public can add messages while open" on public.room_messages;
drop policy if exists "public can read room messages" on public.room_messages;
drop policy if exists "public can delete exploded room messages" on public.room_messages;

create policy "deny direct room reads"
  on public.judgment_rooms
  for select
  using (false);

create policy "deny direct participant reads"
  on public.room_participants
  for select
  using (false);

create policy "deny direct message reads"
  on public.room_messages
  for select
  using (false);

create or replace function public.create_judgment_room(
  p_host_label text,
  p_expires_at timestamptz
)
returns table (
  id uuid,
  access_secret text,
  status text,
  host_label text,
  created_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  result_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_host_label not in ('A', 'B') then
    raise exception 'invalid host label';
  end if;

  if p_expires_at > now() + interval '10 minutes' then
    raise exception 'room expiry is too long';
  end if;

  return query
  insert into public.judgment_rooms (host_label, expires_at, status)
  values (p_host_label, p_expires_at, 'open')
  returning
    judgment_rooms.id,
    judgment_rooms.access_secret,
    judgment_rooms.status,
    judgment_rooms.host_label,
    judgment_rooms.created_at,
    judgment_rooms.started_at,
    judgment_rooms.expires_at,
    judgment_rooms.result_json;
end;
$$;

create or replace function public.get_judgment_room(
  p_room_id uuid,
  p_access_secret text
)
returns table (
  id uuid,
  access_secret text,
  status text,
  host_label text,
  created_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  result_json jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    judgment_rooms.id,
    judgment_rooms.access_secret,
    judgment_rooms.status,
    judgment_rooms.host_label,
    judgment_rooms.created_at,
    judgment_rooms.started_at,
    judgment_rooms.expires_at,
    judgment_rooms.result_json
  from public.judgment_rooms
  where judgment_rooms.id = p_room_id
    and judgment_rooms.access_secret = p_access_secret
    and judgment_rooms.expires_at > now();
$$;

create or replace function public.list_room_participants(
  p_room_id uuid,
  p_access_secret text
)
returns table (
  id uuid,
  room_id uuid,
  role text,
  nickname text,
  client_key text,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    room_participants.id,
    room_participants.room_id,
    room_participants.role,
    room_participants.nickname,
    room_participants.client_key,
    room_participants.joined_at
  from public.room_participants
  join public.judgment_rooms
    on judgment_rooms.id = room_participants.room_id
  where room_participants.room_id = p_room_id
    and judgment_rooms.access_secret = p_access_secret
    and judgment_rooms.expires_at > now()
  order by room_participants.joined_at asc;
$$;

create or replace function public.join_judgment_room(
  p_room_id uuid,
  p_access_secret text,
  p_nickname text,
  p_client_key text
)
returns table (
  participant_id uuid,
  participant_role text,
  participant_nickname text,
  participant_client_key text,
  participant_joined_at timestamptz,
  room_id uuid,
  room_access_secret text,
  room_status text,
  room_host_label text,
  room_created_at timestamptz,
  room_started_at timestamptz,
  room_expires_at timestamptz,
  room_result_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_room public.judgment_rooms%rowtype;
  participant public.room_participants%rowtype;
  next_role text;
  party_count integer;
begin
  if char_length(trim(p_nickname)) not between 1 and 12 then
    raise exception 'invalid nickname';
  end if;

  if char_length(p_client_key) not between 12 and 120 then
    raise exception 'invalid client key';
  end if;

  select *
  into locked_room
  from public.judgment_rooms
  where judgment_rooms.id = p_room_id
    and judgment_rooms.access_secret = p_access_secret
    and judgment_rooms.status = 'open'
    and judgment_rooms.expires_at > now()
  for update;

  if not found then
    raise exception 'room not found';
  end if;

  select *
  into participant
  from public.room_participants
  where room_participants.room_id = p_room_id
    and room_participants.client_key = p_client_key;

  if not found then
    if not exists (
      select 1 from public.room_participants
      where room_participants.room_id = p_room_id
        and room_participants.role = 'A'
    ) then
      next_role := 'A';
    elsif not exists (
      select 1 from public.room_participants
      where room_participants.room_id = p_room_id
        and room_participants.role = 'B'
    ) then
      next_role := 'B';
    else
      next_role := 'spectator';
    end if;

    insert into public.room_participants (room_id, role, nickname, client_key)
    values (p_room_id, next_role, trim(p_nickname), p_client_key)
    returning * into participant;
  end if;

  select count(*)
  into party_count
  from public.room_participants
  where room_participants.room_id = p_room_id
    and room_participants.role in ('A', 'B');

  if locked_room.started_at is null and party_count = 2 then
    update public.judgment_rooms
    set started_at = now(),
        expires_at = now() + interval '60 seconds'
    where judgment_rooms.id = p_room_id
    returning * into locked_room;
  end if;

  return query select
    participant.id,
    participant.role,
    participant.nickname,
    participant.client_key,
    participant.joined_at,
    locked_room.id,
    locked_room.access_secret,
    locked_room.status,
    locked_room.host_label,
    locked_room.created_at,
    locked_room.started_at,
    locked_room.expires_at,
    locked_room.result_json;
end;
$$;

create or replace function public.start_judgment_room_countdown(
  p_room_id uuid,
  p_access_secret text,
  p_started_at timestamptz,
  p_expires_at timestamptz
)
returns table (
  id uuid,
  access_secret text,
  status text,
  host_label text,
  created_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  result_json jsonb
)
language sql
security definer
set search_path = public
as $$
  update public.judgment_rooms
  set started_at = coalesce(judgment_rooms.started_at, p_started_at),
      expires_at = case
        when judgment_rooms.started_at is null then p_expires_at
        else judgment_rooms.expires_at
      end
  where judgment_rooms.id = p_room_id
    and judgment_rooms.access_secret = p_access_secret
    and judgment_rooms.status = 'open'
    and judgment_rooms.started_at is null
  returning
    judgment_rooms.id,
    judgment_rooms.access_secret,
    judgment_rooms.status,
    judgment_rooms.host_label,
    judgment_rooms.created_at,
    judgment_rooms.started_at,
    judgment_rooms.expires_at,
    judgment_rooms.result_json;
$$;

create or replace function public.list_room_messages(
  p_room_id uuid,
  p_access_secret text
)
returns table (
  id uuid,
  room_id uuid,
  author text,
  nickname text,
  client_key text,
  body text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    room_messages.id,
    room_messages.room_id,
    room_messages.author,
    room_messages.nickname,
    room_messages.client_key,
    room_messages.body,
    room_messages.created_at
  from public.room_messages
  join public.judgment_rooms
    on judgment_rooms.id = room_messages.room_id
  where room_messages.room_id = p_room_id
    and judgment_rooms.access_secret = p_access_secret
    and judgment_rooms.status = 'open'
    and judgment_rooms.expires_at > now()
  order by room_messages.created_at asc;
$$;

create or replace function public.send_room_message(
  p_room_id uuid,
  p_access_secret text,
  p_client_key text,
  p_body text
)
returns table (
  id uuid,
  room_id uuid,
  author text,
  nickname text,
  client_key text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  participant public.room_participants%rowtype;
  inserted_message public.room_messages%rowtype;
begin
  if char_length(trim(p_body)) not between 1 and 800 then
    raise exception 'invalid message body';
  end if;

  select room_participants.*
  into participant
  from public.room_participants
  join public.judgment_rooms
    on judgment_rooms.id = room_participants.room_id
  where room_participants.room_id = p_room_id
    and room_participants.client_key = p_client_key
    and room_participants.role in ('A', 'B')
    and judgment_rooms.access_secret = p_access_secret
    and judgment_rooms.status = 'open'
    and judgment_rooms.started_at is not null
    and judgment_rooms.expires_at > now();

  if not found then
    raise exception 'participant cannot send message';
  end if;

  insert into public.room_messages (room_id, author, nickname, client_key, body)
  values (p_room_id, participant.role, participant.nickname, p_client_key, trim(p_body))
  returning * into inserted_message;

  return query select
    inserted_message.id,
    inserted_message.room_id,
    inserted_message.author,
    inserted_message.nickname,
    inserted_message.client_key,
    inserted_message.body,
    inserted_message.created_at;
end;
$$;

create or replace function public.explode_judgment_room(
  p_room_id uuid,
  p_access_secret text,
  p_client_key text,
  p_result_json jsonb
)
returns table (
  id uuid,
  access_secret text,
  status text,
  host_label text,
  created_at timestamptz,
  started_at timestamptz,
  expires_at timestamptz,
  result_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.room_participants
    join public.judgment_rooms
      on judgment_rooms.id = room_participants.room_id
    where room_participants.room_id = p_room_id
      and room_participants.client_key = p_client_key
      and room_participants.role in ('A', 'B')
      and judgment_rooms.access_secret = p_access_secret
      and judgment_rooms.status = 'open'
  ) then
    raise exception 'participant cannot explode room';
  end if;

  delete from public.room_messages
  where room_messages.room_id = p_room_id;

  return query
  update public.judgment_rooms
  set status = 'exploded',
      result_json = p_result_json,
      expires_at = least(judgment_rooms.expires_at, now() + interval '7 days')
  where judgment_rooms.id = p_room_id
    and judgment_rooms.access_secret = p_access_secret
  returning
    judgment_rooms.id,
    judgment_rooms.access_secret,
    judgment_rooms.status,
    judgment_rooms.host_label,
    judgment_rooms.created_at,
    judgment_rooms.started_at,
    judgment_rooms.expires_at,
    judgment_rooms.result_json;
end;
$$;

create or replace function public.cleanup_expired_room_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.room_messages
  using public.judgment_rooms
  where room_messages.room_id = judgment_rooms.id
    and judgment_rooms.expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.create_shared_result(
  p_result_json jsonb,
  p_expires_at timestamptz
)
returns table (
  id uuid,
  result_json jsonb,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_expires_at > now() + interval '7 days' then
    raise exception 'shared result expiry is too long';
  end if;

  return query
  insert into public.judgment_results (result_json, expires_at)
  values (p_result_json, p_expires_at)
  returning
    judgment_results.id,
    judgment_results.result_json,
    judgment_results.created_at,
    judgment_results.expires_at;
end;
$$;

create or replace function public.get_shared_result(
  p_result_id uuid
)
returns table (
  id uuid,
  result_json jsonb,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    judgment_results.id,
    judgment_results.result_json,
    judgment_results.created_at,
    judgment_results.expires_at
  from public.judgment_results
  where judgment_results.id = p_result_id
    and judgment_results.expires_at > now();
$$;

create or replace function public.list_result_comments(
  p_result_id uuid,
  p_limit integer default 20
)
returns table (
  id uuid,
  result_id uuid,
  body text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    result_comments.id,
    result_comments.result_id,
    result_comments.body,
    result_comments.created_at
  from public.result_comments
  join public.judgment_results
    on judgment_results.id = result_comments.result_id
  where result_comments.result_id = p_result_id
    and judgment_results.expires_at > now()
  order by result_comments.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

create or replace function public.add_result_comment(
  p_result_id uuid,
  p_body text
)
returns table (
  id uuid,
  result_id uuid,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_comment public.result_comments%rowtype;
  clean_body text := trim(p_body);
begin
  if char_length(clean_body) not between 1 and 120 then
    raise exception 'invalid comment length';
  end if;

  if clean_body ~* '([0-9]{2,4}[- .]?[0-9]{3,4}[- .]?[0-9]{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})' then
    raise exception 'comment contains private contact information';
  end if;

  if clean_body ~* '(죽여|패버|찾아가|협박|신상|전화해|카톡해)' then
    raise exception 'comment crosses the line';
  end if;

  if not exists (
    select 1
    from public.judgment_results
    where judgment_results.id = p_result_id
      and judgment_results.expires_at > now()
  ) then
    raise exception 'shared result not found';
  end if;

  insert into public.result_comments (result_id, body)
  values (p_result_id, clean_body)
  returning * into inserted_comment;

  return query select
    inserted_comment.id,
    inserted_comment.result_id,
    inserted_comment.body,
    inserted_comment.created_at;
end;
$$;

create or replace function public.get_result_like_state(
  p_result_id uuid,
  p_client_key text
)
returns table (
  like_count bigint,
  has_liked boolean
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.result_likes
      where result_likes.result_id = p_result_id
    ) as like_count,
    exists (
      select 1
      from public.result_likes
      where result_likes.result_id = p_result_id
        and result_likes.client_key = p_client_key
    ) as has_liked
  where exists (
    select 1
    from public.judgment_results
    where judgment_results.id = p_result_id
      and judgment_results.expires_at > now()
  );
$$;

create or replace function public.set_result_like(
  p_result_id uuid,
  p_client_key text,
  p_liked boolean
)
returns table (
  like_count bigint,
  has_liked boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(p_client_key) not between 12 and 120 then
    raise exception 'invalid client key';
  end if;

  if not exists (
    select 1
    from public.judgment_results
    where judgment_results.id = p_result_id
      and judgment_results.expires_at > now()
  ) then
    raise exception 'shared result not found';
  end if;

  if p_liked then
    insert into public.result_likes (result_id, client_key)
    values (p_result_id, p_client_key)
    on conflict (result_id, client_key) do nothing;
  else
    delete from public.result_likes
    where result_likes.result_id = p_result_id
      and result_likes.client_key = p_client_key;
  end if;

  return query
  select * from public.get_result_like_state(p_result_id, p_client_key);
end;
$$;

create or replace function public.list_hot_battles(
  p_limit integer default 5
)
returns table (
  id uuid,
  result_json jsonb,
  created_at timestamptz,
  expires_at timestamptz,
  comment_count bigint,
  like_count bigint,
  score bigint
)
language sql
security definer
set search_path = public
as $$
  select
    judgment_results.id,
    judgment_results.result_json,
    judgment_results.created_at,
    judgment_results.expires_at,
    count(distinct result_comments.id) as comment_count,
    count(distinct result_likes.client_key) as like_count,
    count(distinct result_comments.id) * 3 + count(distinct result_likes.client_key) * 2 as score
  from public.judgment_results
  left join public.result_comments
    on result_comments.result_id = judgment_results.id
  left join public.result_likes
    on result_likes.result_id = judgment_results.id
  where judgment_results.expires_at > now()
    and judgment_results.created_at >= now() - interval '7 days'
  group by judgment_results.id
  order by score desc, judgment_results.created_at desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

create or replace function public.consume_free_judgment_use(
  p_anonymous_user_key text,
  p_usage_date date,
  p_free_limit integer default 3
)
returns table (
  allowed boolean,
  remaining_free_uses integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_row public.daily_ai_usage%rowtype;
begin
  if length(trim(p_anonymous_user_key)) < 8 then
    raise exception 'invalid anonymous user key';
  end if;

  insert into public.anonymous_users (anonymous_user_key)
  values (trim(p_anonymous_user_key))
  on conflict (anonymous_user_key) do nothing;

  insert into public.daily_ai_usage (anonymous_user_key, usage_date)
  values (trim(p_anonymous_user_key), p_usage_date)
  on conflict (anonymous_user_key, usage_date) do nothing;

  select *
  into usage_row
  from public.daily_ai_usage
  where anonymous_user_key = trim(p_anonymous_user_key)
    and usage_date = p_usage_date
  for update;

  if usage_row.free_uses >= p_free_limit + usage_row.share_bonus_uses then
    allowed := false;
    remaining_free_uses := 0;
    return next;
    return;
  end if;

  update public.daily_ai_usage
  set free_uses = free_uses + 1,
      updated_at = now()
  where anonymous_user_key = trim(p_anonymous_user_key)
    and usage_date = p_usage_date
  returning * into usage_row;

  allowed := true;
  remaining_free_uses := greatest(
    0,
    p_free_limit + usage_row.share_bonus_uses - usage_row.free_uses
  );
  return next;
end;
$$;

revoke all on function public.cleanup_expired_room_messages() from public, anon, authenticated;

revoke all on function public.create_judgment_room(text, timestamptz) from public;
revoke all on function public.get_judgment_room(uuid, text) from public;
revoke all on function public.list_room_participants(uuid, text) from public;
revoke all on function public.join_judgment_room(uuid, text, text, text) from public;
revoke all on function public.start_judgment_room_countdown(uuid, text, timestamptz, timestamptz) from public;
revoke all on function public.list_room_messages(uuid, text) from public;
revoke all on function public.send_room_message(uuid, text, text, text) from public;
revoke all on function public.explode_judgment_room(uuid, text, text, jsonb) from public;
revoke all on function public.create_shared_result(jsonb, timestamptz) from public;
revoke all on function public.get_shared_result(uuid) from public;
revoke all on function public.list_result_comments(uuid, integer) from public;
revoke all on function public.add_result_comment(uuid, text) from public;
revoke all on function public.get_result_like_state(uuid, text) from public;
revoke all on function public.set_result_like(uuid, text, boolean) from public;
revoke all on function public.list_hot_battles(integer) from public;
revoke all on function public.consume_free_judgment_use(text, date, integer) from public, anon, authenticated;

grant execute on function public.create_judgment_room(text, timestamptz) to anon, authenticated;
grant execute on function public.get_judgment_room(uuid, text) to anon, authenticated;
grant execute on function public.list_room_participants(uuid, text) to anon, authenticated;
grant execute on function public.join_judgment_room(uuid, text, text, text) to anon, authenticated;
grant execute on function public.start_judgment_room_countdown(uuid, text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.list_room_messages(uuid, text) to anon, authenticated;
grant execute on function public.send_room_message(uuid, text, text, text) to anon, authenticated;
grant execute on function public.explode_judgment_room(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.create_shared_result(jsonb, timestamptz) to anon, authenticated;
grant execute on function public.get_shared_result(uuid) to anon, authenticated;
grant execute on function public.list_result_comments(uuid, integer) to anon, authenticated;
grant execute on function public.add_result_comment(uuid, text) to anon, authenticated;
grant execute on function public.get_result_like_state(uuid, text) to anon, authenticated;
grant execute on function public.set_result_like(uuid, text, boolean) to anon, authenticated;
grant execute on function public.list_hot_battles(integer) to anon, authenticated;
grant execute on function public.consume_free_judgment_use(text, date, integer) to service_role;

drop policy if exists "public can create shareable judgment results" on public.judgment_results;
drop policy if exists "public can read active judgment results" on public.judgment_results;
drop policy if exists "public can read active result comments" on public.result_comments;
drop policy if exists "public can add active result comments" on public.result_comments;
drop policy if exists "public can read active result likes" on public.result_likes;
drop policy if exists "public can add active result likes" on public.result_likes;
drop policy if exists "public can remove own result likes" on public.result_likes;

create policy "deny direct judgment result reads"
  on public.judgment_results
  for select
  using (false);

create policy "deny direct result comment reads"
  on public.result_comments
  for select
  using (false);

create policy "deny direct result like reads"
  on public.result_likes
  for select
  using (false);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'judgment_rooms'
  ) then
    alter publication supabase_realtime add table public.judgment_rooms;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_messages'
  ) then
    alter publication supabase_realtime add table public.room_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_participants'
  ) then
    alter publication supabase_realtime add table public.room_participants;
  end if;
end $$;
