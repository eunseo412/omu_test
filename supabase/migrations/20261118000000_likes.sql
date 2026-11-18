-- 관심(하트): 마음에 드는 옷 저장 → '관심 옷장' 탭
create table if not exists public.item_likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  item_id    uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists item_likes_user_recent on public.item_likes (user_id, created_at desc);

alter table public.item_likes enable row level security;
drop policy if exists "likes own read" on public.item_likes;
create policy "likes own read" on public.item_likes for select using (user_id = auth.uid());
drop policy if exists "likes own add" on public.item_likes;
create policy "likes own add" on public.item_likes for insert with check (user_id = auth.uid());
drop policy if exists "likes own remove" on public.item_likes;
create policy "likes own remove" on public.item_likes for delete using (user_id = auth.uid());
revoke update on public.item_likes from anon, authenticated;
