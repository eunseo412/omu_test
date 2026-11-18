import Link from "next/link";
import { Bell, ChevronRight, Heart, KeyRound, Shirt, UserPen } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/features/auth/actions";
import { PushToggle } from "@/features/notifications/components/push-toggle";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = hasSupabase() ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const profile = user
    ? (await supabase!.from("profiles").select("handle,display_name,avatar_url,trust_temp,style_tags").eq("id", user.id).maybeSingle()).data
    : null;

  if (!user) {
    return (
      <>
        <AppHeader title="MY" right={null} />
        <div className="px-6 py-16 text-center">
          <p className="text-[15px] font-semibold">로그인하고 옷장을 열어보세요</p>
          <p className="mt-1 text-[13px] text-muted">내 옷을 빌려주고, 닮고 싶은 옷장을 팔로우할 수 있어요.</p>
          <Link href="/login?next=/me" className="mt-5 inline-block rounded-xl bg-neutral-900 px-6 py-3 text-[14px] font-semibold text-white">
            로그인
          </Link>
        </div>
      </>
    );
  }

  const name = profile?.display_name ?? "사용자";
  const menu = [
    profile && { href: `/u/${profile.handle}`, label: "내 옷장", Icon: Shirt },
    { href: "/likes", label: "관심 목록", sub: "하트한 옷 · 팔로우한 옷장", Icon: Heart },
    { href: "/notifications", label: "알림", Icon: Bell },
    { href: "/me/edit", label: "프로필 편집", Icon: UserPen },
    { href: "/me/password", label: "비밀번호 설정", Icon: KeyRound },
  ].filter(Boolean) as { href: string; label: string; sub?: string; Icon: typeof Shirt }[];

  return (
    <>
      <AppHeader title="MY" />
      <div className="px-4 pt-2">
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
          <Avatar src={publicImageUrl("avatars", profile?.avatar_url)} name={name} size={60} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-bold">{name}</p>
            <p className="truncate text-[13px] text-muted">@{profile?.handle} · {user.email ?? "소셜 계정"}</p>
            {profile?.style_tags?.length ? (
              <p className="mt-1 truncate text-[12px] text-neutral-600">{profile.style_tags.map((t: string) => `#${t}`).join(" ")}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted">신뢰도</p>
            <p className="text-[17px] font-extrabold">{Number(profile?.trust_temp ?? 36.5).toFixed(1)}℃</p>
          </div>
        </div>

        {profile?.handle.startsWith("user_") && (
          <Link href="/me/edit" className="mt-3 flex items-center justify-between rounded-2xl bg-neutral-900 p-4 text-white">
            <span>
              <b className="block text-[14px]">프로필을 완성해 주세요</b>
              <span className="text-[12px] text-white/70">이름·아이디·추구미를 정하면 내 옷장을 찾기 쉬워져요</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </Link>
        )}

        <ul className="mt-4 divide-y divide-line">
          {menu.map(({ href, label, sub, Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 py-4">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">{label}</span>
                  {sub && <span className="text-[12px] text-muted">{sub}</span>}
                </span>
                <ChevronRight className="h-5 w-5 text-neutral-300" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <PushToggle />

      <form action={signOut} className="px-4 pt-2">
        <button className="text-[13px] text-muted underline">로그아웃</button>
      </form>
    </>
  );
}
