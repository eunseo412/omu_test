-- 상태 기록 사진(분쟁 증거) 필수화
-- 1) 전달(주인)·반납 때 앞면·뒷면·라벨 3컷 필수 (파일 이름: {uid}/{rentalId}/{front|back|label|extra}-{uuid}.jpg)
-- 2) 빌린 사람이 '받은 상태 확인'을 해야 대여 시작 → 그 뒤에만 반납 가능
-- 3) 상태 사진은 아무도 지울 수 없고, 거래 종료 30일 뒤 자동 삭제(서버 작업, proofs_purged_at 기록)
-- 규칙은 packages/core/src/rental.ts 의 requiresProof / canReturn / PROOF_SHOTS 와 같다.

alter table public.rentals add column if not exists received_at timestamptz;      -- 받은 상태 확인 시각
alter table public.rentals add column if not exists closed_at timestamptz;        -- 거래가 끝난 시각(보관 기간 계산)
alter table public.rentals add column if not exists proofs_purged_at timestamptz; -- 보관 기간이 지나 사진을 지운 시각

alter table public.rental_events add column if not exists kind text not null default 'status';
alter table public.rental_events drop constraint if exists rental_events_kind_check;
alter table public.rental_events add constraint rental_events_kind_check check (kind in ('status', 'receipt'));

-- 이미 진행 중이던 거래는 새 절차 없이 계속 진행되게 (기존 데이터 보호)
update public.rentals set received_at = coalesce(received_at, updated_at)
 where status in ('handed_over', 'returned', 'disputed', 'completed') and received_at is null;
update public.rentals set closed_at = coalesce(closed_at, updated_at)
 where status in ('completed', 'cancelled', 'rejected') and closed_at is null;

-- 필수 3컷이 다 있는지 (본인 폴더 + 이 거래 폴더)
create or replace function public.has_required_shots(p_paths text[], p_uid uuid, p_rental uuid)
returns boolean language sql immutable as $$
  select bool_and(exists (
    select 1 from unnest(p_paths) p
    where p like p_uid::text || '/' || p_rental::text || '/' || shot || '-%'
  ))
  from unnest(array['front', 'back', 'label']) shot;
$$;

-- 상태 전이: 기존 규칙 + 필수 사진 + 받은 상태 확인 + 종료 시각
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

  if p_to in ('handed_over', 'returned') and not public.has_required_shots(coalesce(p_photos, '{}'), auth.uid(), r.id) then
    raise exception 'required photos missing';
  end if;
  if p_to = 'returned' and r.received_at is null then
    raise exception 'receipt not confirmed';
  end if;

  update public.rentals
     set status = p_to, updated_at = now(),
         returned_at = case when p_to = 'returned' then now() else returned_at end,
         closed_at = case when p_to in ('completed', 'cancelled', 'rejected') then now() else closed_at end
   where id = r.id;
  insert into public.rental_events (rental_id, actor_id, from_status, to_status, note, photo_paths)
  values (r.id, auth.uid(), r.status, p_to, p_note, coalesce(p_photos, '{}'));
end $$;

-- 받은 상태 확인 (빌린 사람, 전달된 뒤 한 번). 다른 점이 있으면 사진·메모를 함께 남긴다
create or replace function public.confirm_receipt(p_rental_id uuid, p_note text default null, p_photos text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.rentals;
begin
  select * into r from public.rentals where id = p_rental_id for update;
  if not found then raise exception 'rental not found'; end if;
  if auth.uid() is distinct from r.renter_id then raise exception 'not the renter'; end if;
  if r.status <> 'handed_over' then raise exception 'not handed over'; end if;
  if r.received_at is not null then raise exception 'already confirmed'; end if;
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) p where p not like auth.uid()::text || '/' || r.id::text || '/%') then
    raise exception 'invalid photo path';
  end if;

  update public.rentals set received_at = now(), updated_at = now() where id = r.id;
  insert into public.rental_events (rental_id, actor_id, from_status, to_status, note, photo_paths, kind)
  values (r.id, auth.uid(), 'handed_over', 'handed_over', p_note, coalesce(p_photos, '{}'), 'receipt');
end $$;

-- 상태 사진은 증거라서 사용자가 지울 수 없게 (다른 버킷은 기존처럼 본인 파일 삭제 가능)
drop policy if exists "delete own files" on storage.objects;
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id <> 'rental-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- 알림: 전달됨 → '받은 상태를 확인해 주세요', 받은 상태 확인 → 주인에게 알림
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
    when 'handed_over' then
      if new.kind = 'receipt' then
        v_head := '받은 옷 상태를 확인했어요'; v_body := v_actor || '님이 ''' || v_item || ''' 상태를 확인하고 대여를 시작했어요';
      else
        v_head := '옷이 전달됐어요'; v_body := '''' || v_item || ''' · 받은 옷 상태를 사진과 비교해 확인해 주세요';
      end if;
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
