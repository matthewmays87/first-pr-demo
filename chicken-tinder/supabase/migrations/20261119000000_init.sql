-- Chicken Tinder schema: rooms, swipes, matches + match-detection trigger + RLS.
-- Paste into the Supabase SQL Editor, or run `npx supabase db push`.

-- ============ TABLES ============
create table public.rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  host_id       uuid not null default auth.uid() references auth.users(id),
  guest_id      uuid references auth.users(id),
  radius_miles  int  not null check (radius_miles between 1 and 31),
  price_levels  text[],          -- e.g. {'PRICE_LEVEL_INEXPENSIVE','PRICE_LEVEL_MODERATE'}
  cuisine       text,            -- Google place type, e.g. 'mexican_restaurant'
  lat           double precision,
  lng           double precision,
  restaurants   jsonb not null default '[]'::jsonb,  -- the shared deck, in order
  status        text not null default 'waiting'
                check (status in ('waiting', 'active', 'closed')),
  created_at    timestamptz not null default now()
);

create table public.swipes (
  room_id    uuid not null references public.rooms(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id),
  place_id   text not null,
  liked      boolean not null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id, place_id)   -- one swipe per card per person
);

create table public.matches (
  room_id    uuid not null references public.rooms(id) on delete cascade,
  place_id   text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, place_id)
);

-- ============ HELPERS ============
create or replace function public.is_room_member(r uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from rooms where id = r and auth.uid() in (host_id, guest_id));
$$;

-- Host calls this to create a room. Generates a 4-char code (no 0/O/1/I confusion).
create or replace function public.create_room(
  p_radius_miles int,
  p_price_levels text[],
  p_cuisine text,
  p_lat double precision,
  p_lng double precision
) returns public.rooms language plpgsql security definer set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  r rooms;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  loop
    new_code := '';
    for i in 1..4 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into rooms (code, host_id, radius_miles, price_levels, cuisine, lat, lng)
      values (new_code, auth.uid(), p_radius_miles, p_price_levels, p_cuisine, p_lat, p_lng)
      returning * into r;
      return r;
    exception when unique_violation then
      -- code already taken, try another
    end;
  end loop;
end $$;

-- Guest calls this with the code. Claims the empty seat, or re-joins if already in the room.
create or replace function public.join_room(p_code text)
returns public.rooms language plpgsql security definer set search_path = public as $$
declare r rooms;
begin
  update rooms set guest_id = auth.uid()
   where code = upper(p_code) and guest_id is null
     and host_id <> auth.uid() and status <> 'closed'
  returning * into r;

  if r.id is null then
    select * into r from rooms
     where code = upper(p_code) and auth.uid() in (host_id, guest_id);
  end if;

  if r.id is null then
    raise exception 'Room not found or already full';
  end if;
  return r;
end $$;

-- ============ MATCH DETECTION (runs in the database) ============
create or replace function public.check_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- One swipe per room at a time, so two simultaneous right-swipes can't miss each other.
  -- (Advisory lock instead of SELECT ... FOR UPDATE: that deadlocks against the
  -- foreign-key lock each swipe insert already holds on the room row.)
  perform pg_advisory_xact_lock(hashtext(new.room_id::text));

  if new.liked and exists (
    select 1 from swipes
     where room_id = new.room_id and place_id = new.place_id
       and user_id <> new.user_id and liked
  ) then
    insert into matches (room_id, place_id)
    values (new.room_id, new.place_id)
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger swipes_check_match
after insert on public.swipes
for each row execute function public.check_match();

-- ============ ROW LEVEL SECURITY ============
alter table public.rooms   enable row level security;
alter table public.swipes  enable row level security;
alter table public.matches enable row level security;

create policy "members read room" on public.rooms
  for select using (auth.uid() in (host_id, guest_id));
create policy "host updates room" on public.rooms
  for update using (auth.uid() = host_id) with check (auth.uid() = host_id);
-- no insert policy on rooms: create_room() does it

create policy "members read swipes" on public.swipes
  for select using (public.is_room_member(room_id));
create policy "insert own swipe" on public.swipes
  for insert with check (user_id = auth.uid() and public.is_room_member(room_id));

create policy "members read matches" on public.matches
  for select using (public.is_room_member(room_id));
-- no insert policy on matches: only the trigger writes there

-- ============ REALTIME ============
alter publication supabase_realtime add table public.rooms, public.matches;
