-- 알림: 거래 상태 변화·채팅 → 상대방에게 알림 생성 (DB 트리거라 어떤 경로로 바뀌어도 빠지지 않음)
-- + 웹 푸시 구독 저장

-- ── 알림 ──────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('rental', 'message')),
  rental_id  uuid references public.rentals(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text not null default '',
  link       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_recent on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notifications own mark read" on public.notifications;
create policy "notifications own mark read" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- 사용자는 read_at 만 바꿀 수 있다. 생성은 트리거(security definer)만.
revoke insert, update, delete on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- 거래 상태 변화 → 상대에게
create or replace function public.notify_rental_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.rentals;
  v_title text;
  v_item text;
  v_actor text;
  v_to uuid;
  v_head text;
  v_body text;
  v_period text;
begin
  select * into r from public.rentals where id = new.rental_id;
  if not found then return new; end if;
  select title into v_item from public.items where id = r.item_id;
  select handle into v_actor from public.profiles where id = new.actor_id;
  v_item := coalesce(v_item, '옷');
  v_actor := coalesce('@' || v_actor, '상대방');
  v_period := to_char(r.start_date, 'FMMM/FMDD') || '~' || to_char(r.end_date, 'FMMM/FMDD');
  -- 행동한 사람이 아닌 쪽이 받는다
  v_to := case when new.actor_id = r.owner_id then r.renter_id else r.owner_id end;

  case new.to_status
    when 'requested'   then v_head := '새 대여 신청';        v_body := v_actor || '님이 ''' || v_item || ''' 대여를 신청했어요 (' || v_period || ')';
    when 'accepted'    then v_head := '대여 신청이 수락됐어요'; v_body := '''' || v_item || ''' · 채팅으로 만날 시간을 정해보세요';
    when 'rejected'    then v_head := '대여 신청이 거절됐어요'; v_body := '''' || v_item || ''' · 다른 날짜나 다른 옷을 찾아보세요';
    when 'cancelled'   then v_head := '거래가 취소됐어요';     v_body := v_actor || '님이 ''' || v_item || ''' 거래를 취소했어요';
    when 'handed_over' then v_head := '대여가 시작됐어요';     v_body := '''' || v_item || ''' · 반납일 ' || to_char(r.end_date, 'FMMM/FMDD');
    when 'returned'    then
      if new.actor_id = r.renter_id then
        v_head := '옷이 반납됐어요'; v_body := '''' || v_item || ''' 상태를 확인하고 반납을 승인해 주세요';
      else
        v_head := '반납이 처리됐어요'; v_body := '''' || v_item || ''' · 주인이 상태를 확인하고 있어요';
      end if;
    when 'disputed'    then v_head := '반납한 옷에 문제가 신고됐어요'; v_body := '''' || v_item || ''' · 내용을 확인해 주세요';
    when 'completed'   then v_head := '거래가 완료됐어요';     v_body := '''' || v_item || ''' · ' || v_actor || '님에게 평가를 남겨주세요';
    else return new;
  end case;

  insert into public.notifications (user_id, kind, rental_id, actor_id, title, body, link)
  values (v_to, 'rental', r.id, new.actor_id, v_head, v_body, '/rentals/' || r.id);
  return new;
end $$;
drop trigger if exists rental_event_notify on public.rental_events;
create trigger rental_event_notify after insert on public.rental_events
  for each row execute function public.notify_rental_event();

-- 채팅 → 상대에게. 안 읽은 채팅 알림이 있으면 새로 만들지 않고 갱신 (알림함 도배 방지)
create or replace function public.notify_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.rentals;
  v_to uuid;
  v_sender text;
  v_body text := left(regexp_replace(new.body, '\s+', ' ', 'g'), 80);
begin
  select * into r from public.rentals where id = new.rental_id;
  if not found then return new; end if;
  v_to := case when new.sender_id = r.owner_id then r.renter_id else r.owner_id end;
  select '@' || handle into v_sender from public.profiles where id = new.sender_id;

  update public.notifications
     set body = v_body, created_at = now(), actor_id = new.sender_id
   where user_id = v_to and kind = 'message' and rental_id = r.id and read_at is null;
  if not found then
    insert into public.notifications (user_id, kind, rental_id, actor_id, title, body, link)
    values (v_to, 'message', r.id, new.sender_id, coalesce(v_sender, '상대방') || '님의 메시지', v_body, '/rentals/' || r.id);
  end if;
  return new;
end $$;
drop trigger if exists message_notify on public.messages;
create trigger message_notify after insert on public.messages
  for each row execute function public.notify_message();

-- ── 웹 푸시 구독 ───────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push own read" on public.push_subscriptions;
create policy "push own read" on public.push_subscriptions for select using (user_id = auth.uid());
drop policy if exists "push own delete" on public.push_subscriptions;
create policy "push own delete" on public.push_subscriptions for delete using (user_id = auth.uid());
revoke insert, update on public.push_subscriptions from anon, authenticated;

-- 같은 기기에서 다른 계정으로 로그인하면 구독을 새 계정으로 넘긴다
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end $$;

-- ── 실시간 (종 배지) ───────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
