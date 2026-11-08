-- O:MU 초기 스키마 (베타)
-- 원칙: 모든 테이블 RLS ON. 상태 변경 같은 민감한 쓰기는 RPC(security definer)로만 허용.

create extension if not exists "pgcrypto";

-- ── 프로필: 사람 중심 탐색의 단위 ─────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null check (handle ~ '^[a-z0-9_.]{3,20}$'),
  display_name  text not null,
  bio           text default '',
  avatar_url    text,
  style_tags    text[] not null default '{}',   -- 추구미
  height_cm     smallint check (height_cm between 120 and 230),
  top_size      text,
  bottom_size   text,
  shoe_size     smallint,
  trust_temp    numeric(4,1) not null default 36.5,
  is_verified_student boolean not null default false, -- 베타: KENTECH 메일 인증
  created_at    timestamptz not null default now()
);

create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  followee_id uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ── 옷장 아이템 ───────────────────────────────────────────────
create type item_status as enum ('active', 'hidden', 'deleted');

create table public.items (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  description    text not null default '',
  category       text not null,
  size           text not null,
  brand          text,
  style_tags     text[] not null default '{}',
  price_per_day  integer not null check (price_per_day >= 0),
  deposit        integer not null check (deposit >= 0),
  min_days       smallint not null default 1,
  max_days       smallint not null default 7,
  for_sale       boolean not null default false,
  handoff_methods text[] not null default '{in_person}',
  status         item_status not null default 'active',
  created_at     timestamptz not null default now(),
  check (min_days <= max_days)
);
create index on public.items (owner_id, created_at desc);
create index on public.items using gin (style_tags);

create table public.item_images (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items(id) on delete cascade,
  path       text not null,         -- storage 'items' 버킷 경로
  sort_order smallint not null default 0
);

-- 착장(룩) 포스트: 사람의 스타일을 보여주는 피드 단위
create table public.looks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  image_path text not null,
  caption    text default '',
  created_at timestamptz not null default now()
);
create table public.look_items (
  look_id uuid references public.looks(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  primary key (look_id, item_id)
);

-- ── 대여 거래 (상태 머신은 packages/core/src/rental.ts 와 동일하게 유지) ──
create type rental_status as enum
  ('requested','accepted','rejected','cancelled','handed_over','returned','disputed','completed');

create table public.rentals (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id),
  owner_id      uuid not null references public.profiles(id),
  renter_id     uuid not null references public.profiles(id),
  start_date    date not null,
  end_date      date not null,
  handoff_method text not null,
  -- 신청 시점 가격 스냅샷 (판매자가 가격을 바꿔도 거래 금액 고정)
  price_per_day integer not null,
  fee_total     integer not null,
  deposit       integer not null,
  message       text,
  status        rental_status not null default 'requested',
  returned_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (start_date <= end_date),
  check (owner_id <> renter_id)
);
create index on public.rentals (owner_id, status);
create index on public.rentals (renter_id, status);

-- 상태 변경 이력: 분쟁 대응 + 베타 지표(전환율, 반납 지연율) 분석용
create table public.rental_events (
  id         bigint generated always as identity primary key,
  rental_id  uuid not null references public.rentals(id) on delete cascade,
  actor_id   uuid references public.profiles(id),
  from_status rental_status,
  to_status  rental_status not null,
  note       text,
  photo_paths text[] not null default '{}', -- 인도/반납 시 상태 사진
  created_at timestamptz not null default now()
);

-- 결제/보증금: 베타는 수동 기록, 이후 PG(PortOne) 연동 시 같은 테이블 사용
create type payment_kind as enum ('rental_fee', 'deposit_hold', 'deposit_release', 'deposit_capture', 'platform_fee');
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  rental_id   uuid not null references public.rentals(id),
  kind        payment_kind not null,
  amount      integer not null,
  provider    text not null default 'manual',
  provider_ref text,
  created_at  timestamptz not null default now()
);

-- 상호 평가 → 신뢰도 온도
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  rental_id   uuid not null references public.rentals(id),
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  condition   smallint not null check (condition between 1 and 5),
  punctuality smallint not null check (punctuality between 1 and 5),
  manner      smallint not null check (manner between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (rental_id, reviewer_id)
);

-- 거래별 1:1 채팅 (Supabase Realtime)
create table public.messages (
  id         bigint generated always as identity primary key,
  rental_id  uuid not null references public.rentals(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id),
  body       text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.follows       enable row level security;
alter table public.items         enable row level security;
alter table public.item_images   enable row level security;
alter table public.looks         enable row level security;
alter table public.look_items    enable row level security;
alter table public.rentals       enable row level security;
alter table public.rental_events enable row level security;
alter table public.payments      enable row level security;
alter table public.reviews       enable row level security;
alter table public.messages      enable row level security;

-- 공개 읽기
create policy "profiles readable" on public.profiles for select using (true);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);

create policy "follows readable" on public.follows for select using (true);
create policy "follow self" on public.follows for insert with check (auth.uid() = follower_id);
create policy "unfollow self" on public.follows for delete using (auth.uid() = follower_id);

create policy "items readable" on public.items for select using (status = 'active' or owner_id = auth.uid());
create policy "items owner write" on public.items for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "item_images readable" on public.item_images for select using (true);
create policy "item_images owner write" on public.item_images for all
  using (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));

create policy "looks readable" on public.looks for select using (true);
create policy "looks owner write" on public.looks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "look_items readable" on public.look_items for select using (true);
create policy "look_items owner write" on public.look_items for all
  using (exists (select 1 from public.looks l where l.id = look_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.looks l where l.id = look_id and l.owner_id = auth.uid()));

-- 거래 당사자만 열람. 생성·상태변경은 아래 RPC로만 (직접 insert/update 정책 없음)
create policy "rentals parties read" on public.rentals for select
  using (auth.uid() in (owner_id, renter_id));
create policy "rental_events parties read" on public.rental_events for select
  using (exists (select 1 from public.rentals r where r.id = rental_id and auth.uid() in (r.owner_id, r.renter_id)));
create policy "payments parties read" on public.payments for select
  using (exists (select 1 from public.rentals r where r.id = rental_id and auth.uid() in (r.owner_id, r.renter_id)));
create policy "reviews readable" on public.reviews for select using (true);
create policy "messages parties read" on public.messages for select
  using (exists (select 1 from public.rentals r where r.id = rental_id and auth.uid() in (r.owner_id, r.renter_id)));
create policy "messages parties send" on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.rentals r where r.id = rental_id and auth.uid() in (r.owner_id, r.renter_id)));

-- ── RPC: 대여 신청 (가격은 서버에서 스냅샷, 클라이언트 값 신뢰 안 함) ──
create or replace function public.request_rental(
  p_item_id uuid, p_start date, p_end date, p_handoff text, p_message text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_item public.items;
  v_days int;
  v_id uuid;
begin
  select * into v_item from public.items where id = p_item_id and status = 'active';
  if not found then raise exception 'item not available'; end if;
  if v_item.owner_id = auth.uid() then raise exception 'cannot rent own item'; end if;
  if not (p_handoff = any (v_item.handoff_methods)) then raise exception 'invalid handoff method'; end if;
  v_days := (p_end - p_start) + 1;
  if v_days < v_item.min_days or v_days > v_item.max_days then raise exception 'invalid rental period'; end if;
  if exists (
    select 1 from public.rentals
    where item_id = p_item_id and status in ('accepted','handed_over','returned','disputed')
      and daterange(start_date, end_date, '[]') && daterange(p_start, p_end, '[]')
  ) then raise exception 'dates unavailable'; end if;

  insert into public.rentals (item_id, owner_id, renter_id, start_date, end_date, handoff_method,
                              price_per_day, fee_total, deposit, message)
  values (p_item_id, v_item.owner_id, auth.uid(), p_start, p_end, p_handoff,
          v_item.price_per_day, v_item.price_per_day * v_days, v_item.deposit, p_message)
  returning id into v_id;

  insert into public.rental_events (rental_id, actor_id, from_status, to_status)
  values (v_id, auth.uid(), null, 'requested');
  return v_id;
end $$;

-- ── RPC: 상태 전이 (packages/core RENTAL_TRANSITIONS 와 동일 규칙) ──
create or replace function public.transition_rental(
  p_rental_id uuid, p_to rental_status, p_note text default null, p_photos text[] default '{}'
) returns void language plpgsql security definer set search_path = public as $$
declare
  r public.rentals;
  actor text;
  ok boolean;
begin
  select * into r from public.rentals where id = p_rental_id for update;
  if not found then raise exception 'rental not found'; end if;
  actor := case when auth.uid() = r.owner_id then 'owner'
                when auth.uid() = r.renter_id then 'renter' else null end;
  if actor is null then raise exception 'not a party'; end if;

  ok := case
    when r.status = 'requested'   and p_to in ('accepted','rejected') then actor = 'owner'
    when r.status = 'requested'   and p_to = 'cancelled'              then true
    when r.status = 'accepted'    and p_to = 'handed_over'            then actor = 'owner'
    when r.status = 'accepted'    and p_to = 'cancelled'              then true
    when r.status = 'handed_over' and p_to = 'returned'               then true
    when r.status = 'returned'    and p_to in ('completed','disputed') then actor = 'owner'
    else false end;  -- disputed → completed 는 관리자(service role)만
  if not ok then raise exception 'transition % -> % not allowed for %', r.status, p_to, actor; end if;

  update public.rentals
     set status = p_to, updated_at = now(),
         returned_at = case when p_to = 'returned' then now() else returned_at end
   where id = r.id;
  insert into public.rental_events (rental_id, actor_id, from_status, to_status, note, photo_paths)
  values (r.id, auth.uid(), r.status, p_to, p_note, p_photos);
end $$;

-- ── 가입 시 프로필 자동 생성 ──
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 10),
          coalesce(new.raw_user_meta_data->>'name', '새 사용자'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage 버킷 ──
insert into storage.buckets (id, name, public) values ('items', 'items', true), ('avatars', 'avatars', true), ('rental-proofs', 'rental-proofs', false)
on conflict do nothing;
create policy "upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('items','avatars','rental-proofs') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);
