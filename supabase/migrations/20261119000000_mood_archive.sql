-- mood archive: 빌린 옷을 모아 보는 '입어본 옷장'. 다른 사용자도 볼 수 있다(카드별 숨기기 가능).
-- 거래가 완료되면 빌린 사람의 아카이브에 그 옷이 자동으로 수집된다.
-- 옷이 나중에 수정·삭제돼도 남도록 거래 시점의 이름·사진·주인을 저장(스냅샷)한다.
-- illustration_*: 2단계에서 OpenAI로 '색연필 스케치, 사람 없이 옷만' 일러스트를 만들어 채운다.

create table if not exists public.mood_archive (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,  -- 빌린 사람
  rental_id           uuid not null unique references public.rentals(id) on delete cascade,
  item_id             uuid references public.items(id) on delete set null,
  owner_id            uuid references public.profiles(id) on delete set null,          -- 옷 주인
  title               text not null,
  style_tags          text[] not null default '{}',
  source_path         text,                       -- 원본 옷 사진 (items 버킷)
  illustration_path   text,                       -- AI 일러스트 (2단계)
  illustration_status text not null default 'pending'
                      check (illustration_status in ('pending', 'ready', 'failed', 'skipped')),
  rented_from         date not null,
  rented_to           date not null,
  hidden              boolean not null default false,  -- 카드별 숨기기
  seen_at             timestamptz,                     -- '내 옷장에 추가됐어요' 카드를 봤는지
  created_at          timestamptz not null default now()
);
create index if not exists mood_archive_user_recent on public.mood_archive (user_id, created_at desc);

alter table public.mood_archive enable row level security;
drop policy if exists "archive public read" on public.mood_archive;
create policy "archive public read" on public.mood_archive for select
  using (hidden = false or user_id = auth.uid());
drop policy if exists "archive own update" on public.mood_archive;
create policy "archive own update" on public.mood_archive for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- 사용자는 숨기기·확인 표시만 바꿀 수 있다. 생성은 트리거만.
revoke insert, update, delete on public.mood_archive from anon, authenticated;
grant select on public.mood_archive to anon, authenticated;
grant update (hidden, seen_at) on public.mood_archive to authenticated;

-- 거래 시점 스냅샷으로 아카이브 행 만들기 (이미 있으면 그대로)
create or replace function public.archive_rental(p_rental_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.rentals;
  v_item public.items;
  v_path text;
  v_id uuid;
begin
  select * into r from public.rentals where id = p_rental_id;
  if not found or r.status <> 'completed' then return null; end if;
  select * into v_item from public.items where id = r.item_id;
  select path into v_path from public.item_images where item_id = r.item_id order by sort_order limit 1;
  insert into public.mood_archive (user_id, rental_id, item_id, owner_id, title, style_tags, source_path, rented_from, rented_to, created_at)
  values (r.renter_id, r.id, r.item_id, r.owner_id, coalesce(v_item.title, '옷'), coalesce(v_item.style_tags, '{}'),
          v_path, r.start_date, r.end_date, r.updated_at)
  on conflict (rental_id) do nothing
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.archive_rental(uuid) from public, anon, authenticated;

create or replace function public.on_rental_completed_archive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.archive_rental(new.id);
  end if;
  return new;
end $$;
drop trigger if exists rental_completed_archive on public.rentals;
create trigger rental_completed_archive after update of status on public.rentals
  for each row execute function public.on_rental_completed_archive();

-- 이미 완료된 거래도 아카이브에 넣기
select public.archive_rental(id) from public.rentals where status = 'completed';

-- 옷 사진을 수정할 때, 아카이브가 쓰는 사진 파일은 지우지 않도록 확인용
create or replace function public.archived_paths(p_paths text[]) returns setof text
language sql stable security definer set search_path = public as $$
  select distinct source_path from public.mood_archive where source_path = any (p_paths);
$$;
grant execute on function public.archived_paths(text[]) to authenticated;

-- 완료 알림: 빌린 사람에게는 'mood archive에 추가됐어요' + 카드 링크
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
  v_archive uuid;
  v_link text;
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
    when 'completed'   then
      select a.id into v_archive from public.mood_archive a where a.rental_id = r.id and a.user_id = v_to;
      if v_archive is not null then
        v_head := 'mood archive에 추가됐어요'; v_body := '''' || v_item || ''' · ' || v_actor || '님의 옷';
        v_link := '/archive/' || v_archive;
      else
        v_head := '거래가 완료됐어요'; v_body := '''' || v_item || ''' · ' || v_actor || '님에게 평가를 남겨주세요';
      end if;
    else return new;
  end case;

  insert into public.notifications (user_id, kind, rental_id, actor_id, title, body, link)
  values (v_to, 'rental', r.id, new.actor_id, v_head, v_body, coalesce(v_link, '/rentals/' || r.id));
  return new;
end $$;
