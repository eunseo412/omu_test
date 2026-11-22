-- 체형 필터: 성별(공개)·몸무게(비공개) 추가, 홈에서 옷장 주인의 체형으로 옷 거르기
-- 몸무게는 프로필에 보이지 않고 필터에만 쓰인다:
--   1) 다른 사용자는 weight_kg 칸을 읽을 수 없다 (칸 단위 권한)
--   2) 본인 값은 get_my_body()로만 읽는다
--   3) 필터는 5kg 단위 구간으로만 검색 가능 → 정확한 값을 알아내기 어렵게

alter table public.profiles add column if not exists gender text;
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender in ('female', 'male', 'other'));
alter table public.profiles add column if not exists weight_kg smallint;
alter table public.profiles drop constraint if exists profiles_weight_check;
alter table public.profiles add constraint profiles_weight_check check (weight_kg between 30 and 200);

-- 칸 단위 읽기 권한: weight_kg 만 빼고 모두 공개 (새 칸을 추가하면 여기에도 추가할 것)
revoke select on public.profiles from anon, authenticated;
grant select (id, handle, display_name, bio, avatar_url, style_tags, height_cm, top_size, bottom_size, shoe_size,
              trust_temp, is_verified_student, created_at, gender)
  on public.profiles to anon, authenticated;

-- 본인 체형 정보 (프로필 편집 화면용)
create or replace function public.get_my_body()
returns table (gender text, height_cm smallint, weight_kg smallint)
language sql stable security definer set search_path = public as $$
  select p.gender, p.height_cm, p.weight_kg from public.profiles p where p.id = auth.uid();
$$;
grant execute on function public.get_my_body() to authenticated;

-- 체형 조건에 맞는 옷장 주인 id (홈 필터용). 몸무게는 5kg 단위 구간만 허용
create or replace function public.owners_by_body(
  p_gender text default null,
  p_height_min int default null, p_height_max int default null,
  p_weight_min int default null, p_weight_max int default null
) returns setof uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if (p_weight_min is not null and p_weight_min % 5 <> 0) or (p_weight_max is not null and p_weight_max % 5 <> 0) then
    raise exception 'weight range must use 5kg steps';
  end if;
  return query
    select p.id from public.profiles p
    where (p_gender is null or p.gender = p_gender)
      and (p_height_min is null or p.height_cm >= p_height_min)
      and (p_height_max is null or p.height_cm < p_height_max)
      and (p_weight_min is null or p.weight_kg >= p_weight_min)
      and (p_weight_max is null or p.weight_kg < p_weight_max);
end $$;
grant execute on function public.owners_by_body(text, int, int, int, int) to anon, authenticated;
