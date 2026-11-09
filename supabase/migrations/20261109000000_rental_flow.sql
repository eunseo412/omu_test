-- 대여 흐름: 예약 날짜 조회, 신청 검증 강화, 상호 평가·신뢰도 온도, 인증 사진 열람, 채팅 실시간
-- 신뢰도 계산은 packages/core/src/trust.ts 와 같은 규칙을 유지한다.

-- ── 1) 예약된 기간 (거래 당사자가 아니어도 날짜만 공개) ─────────────
create or replace function public.item_booked_ranges(p_item_id uuid)
returns table (start_date date, end_date date)
language sql stable security definer set search_path = public as $$
  select r.start_date, r.end_date
  from public.rentals r
  where r.item_id = p_item_id
    and r.status in ('accepted', 'handed_over', 'returned', 'disputed')
    and r.end_date >= (now() at time zone 'Asia/Seoul')::date
  order by r.start_date;
$$;
grant execute on function public.item_booked_ranges(uuid) to anon, authenticated;

-- ── 2) 대여 신청: 과거 날짜·중복 신청 방지 추가 ───────────────────
create or replace function public.request_rental(
  p_item_id uuid, p_start date, p_end date, p_handoff text, p_message text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_item public.items;
  v_days int;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_item from public.items where id = p_item_id and status = 'active';
  if not found then raise exception 'item not available'; end if;
  if v_item.owner_id = auth.uid() then raise exception 'cannot rent own item'; end if;
  if p_start < (now() at time zone 'Asia/Seoul')::date then raise exception 'start date in past'; end if;
  if not (p_handoff = any (v_item.handoff_methods)) then raise exception 'invalid handoff method'; end if;
  v_days := (p_end - p_start) + 1;
  if v_days < v_item.min_days or v_days > v_item.max_days then raise exception 'invalid rental period'; end if;
  if exists (
    select 1 from public.rentals
    where item_id = p_item_id and status in ('accepted','handed_over','returned','disputed')
      and daterange(start_date, end_date, '[]') && daterange(p_start, p_end, '[]')
  ) then raise exception 'dates unavailable'; end if;
  if exists (
    select 1 from public.rentals
    where item_id = p_item_id and renter_id = auth.uid() and status = 'requested'
  ) then raise exception 'duplicate request'; end if;

  insert into public.rentals (item_id, owner_id, renter_id, start_date, end_date, handoff_method,
                              price_per_day, fee_total, deposit, message)
  values (p_item_id, v_item.owner_id, auth.uid(), p_start, p_end, p_handoff,
          v_item.price_per_day, v_item.price_per_day * v_days, v_item.deposit, p_message)
  returning id into v_id;

  insert into public.rental_events (rental_id, actor_id, from_status, to_status, note)
  values (v_id, auth.uid(), null, 'requested', p_message);
  return v_id;
end $$;

-- ── 3) 신뢰도 온도 헬퍼 (0~99, 소수 1자리) ─────────────────────────
create or replace function public.bump_trust(p_user uuid, p_delta numeric)
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set trust_temp = round(least(99, greatest(0, trust_temp + p_delta)), 1)
   where id = p_user;
$$;
revoke execute on function public.bump_trust(uuid, numeric) from public, anon, authenticated;

-- 거래 정상 완료 시 양쪽 +0.1 (core: { kind: "completed" })
create or replace function public.on_rental_completed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.bump_trust(new.owner_id, 0.1);
    perform public.bump_trust(new.renter_id, 0.1);
  end if;
  return new;
end $$;
drop trigger if exists rental_completed_trust on public.rentals;
create trigger rental_completed_trust after update of status on public.rentals
  for each row execute function public.on_rental_completed();

-- ── 4) 상호 평가 (완료된 거래, 1회) → 상대 신뢰도 반영 ──────────────
-- core: { kind: "review", avgScore } → (avg - 3) * 0.2
create or replace function public.submit_review(
  p_rental_id uuid, p_condition int, p_punctuality int, p_manner int, p_comment text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  r public.rentals;
  v_reviewee uuid;
begin
  select * into r from public.rentals where id = p_rental_id;
  if not found then raise exception 'rental not found'; end if;
  if r.status <> 'completed' then raise exception 'rental not completed'; end if;
  if auth.uid() = r.owner_id then v_reviewee := r.renter_id;
  elsif auth.uid() = r.renter_id then v_reviewee := r.owner_id;
  else raise exception 'not a party'; end if;
  if exists (select 1 from public.reviews where rental_id = r.id and reviewer_id = auth.uid()) then
    raise exception 'already reviewed';
  end if;
  if least(p_condition, p_punctuality, p_manner) < 1 or greatest(p_condition, p_punctuality, p_manner) > 5 then
    raise exception 'invalid score';
  end if;

  insert into public.reviews (rental_id, reviewer_id, reviewee_id, condition, punctuality, manner, comment)
  values (r.id, auth.uid(), v_reviewee, p_condition, p_punctuality, p_manner, nullif(trim(p_comment), ''));

  perform public.bump_trust(v_reviewee, ((p_condition + p_punctuality + p_manner) / 3.0 - 3) * 0.2);
end $$;

-- ── 5) 인증 사진: 경로 {uid}/{rental_id}/파일 → 거래 당사자만 열람 ────
drop policy if exists "rental proofs parties read" on storage.objects;
create policy "rental proofs parties read" on storage.objects for select to authenticated
  using (
    bucket_id = 'rental-proofs'
    and exists (
      select 1 from public.rentals r
      where r.id::text = (storage.foldername(name))[2]
        and auth.uid() in (r.owner_id, r.renter_id)
    )
  );

-- ── 6) 채팅 실시간 구독 ─────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

-- ── 7) 가입 시 자동 아이디 충돌 방지 ────────────────────────────────
-- 기존: user_ + id 앞 10자리 → 겹치면 가입 자체가 실패. 15자리 + 충돌 시 무작위 재시도.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_handle text := 'user_' || right(replace(new.id::text, '-', ''), 15);
begin
  while exists (select 1 from public.profiles where handle = v_handle) loop
    v_handle := 'user_' || substr(md5(random()::text), 1, 15);
  end loop;
  insert into public.profiles (id, handle, display_name)
  values (new.id, v_handle, coalesce(new.raw_user_meta_data->>'name', '새 사용자'));
  return new;
end $$;
