-- 보증금 선납 폐지 → 등록 결제수단으로 '사후 자동결제' (틀만, 실제 PG 연동은 이후)
-- - 대여료: 반납 승인(거래 완료) 뒤 빌린 사람의 기본 결제수단으로 자동 결제
-- - items.deposit / rentals.deposit: 이제 '분실·파손 시 보상 기준액'(미리 받지 않음). 분쟁으로 귀책이 확인될 때만 이 금액 안에서 청구
-- - 결제 실행은 서버 작업(서비스 롤)이 payment_status='scheduled' 거래를 처리한다 (미구현)

comment on column public.items.deposit is '분실·파손 시 보상 기준액(원). 미리 받지 않으며 귀책 확인 시에만 청구';
comment on column public.rentals.deposit is '신청 시점의 보상 기준액 스냅샷';

-- 결제수단: 빌링키(PG가 발급한 자동결제 키)는 서버만 읽는다
create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  provider    text not null default 'portone',
  billing_key text not null,
  card_brand  text,
  card_last4  text check (card_last4 ~ '^[0-9]{4}$'),
  is_default  boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists payment_methods_user on public.payment_methods (user_id);
create unique index if not exists payment_methods_one_default on public.payment_methods (user_id) where is_default;

alter table public.payment_methods enable row level security;
drop policy if exists "pm own read" on public.payment_methods;
create policy "pm own read" on public.payment_methods for select using (user_id = auth.uid());
drop policy if exists "pm own delete" on public.payment_methods;
create policy "pm own delete" on public.payment_methods for delete using (user_id = auth.uid());
-- 등록은 서버(PG 빌링키 발급 후, 서비스 롤)만. 사용자는 빌링키 칸을 읽을 수 없다
revoke insert, update, select on public.payment_methods from anon, authenticated;
grant select (id, user_id, provider, card_brand, card_last4, is_default, created_at) on public.payment_methods to authenticated;
grant delete on public.payment_methods to authenticated;

-- 거래별 결제 상태
alter table public.rentals add column if not exists payment_method_id uuid references public.payment_methods(id) on delete set null;
alter table public.rentals add column if not exists payment_status text not null default 'none';
alter table public.rentals drop constraint if exists rentals_payment_status_check;
alter table public.rentals add constraint rentals_payment_status_check
  check (payment_status in ('none', 'scheduled', 'charged', 'failed', 'waived'));
alter table public.rentals add column if not exists charged_amount integer;
alter table public.rentals add column if not exists charged_at timestamptz;

-- 신청할 때 빌린 사람의 기본 결제수단을 거래에 연결
create or replace function public.attach_payment_method() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.payment_method_id is null then
    select id into new.payment_method_id from public.payment_methods
     where user_id = new.renter_id and is_default limit 1;
  end if;
  return new;
end $$;
drop trigger if exists rental_attach_payment on public.rentals;
create trigger rental_attach_payment before insert on public.rentals
  for each row execute function public.attach_payment_method();

-- 거래 완료 → 결제 예정 (결제수단이 없으면 베타처럼 직접 정산: none 유지)
create or replace function public.schedule_rental_payment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.payment_method_id is not null
     and new.payment_status = 'none' then
    new.payment_status := 'scheduled';
  end if;
  return new;
end $$;
drop trigger if exists rental_schedule_payment on public.rentals;
create trigger rental_schedule_payment before update of status on public.rentals
  for each row execute function public.schedule_rental_payment();
