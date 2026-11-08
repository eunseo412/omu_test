import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = hasSupabase() ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const profile = user
    ? (await supabase!.from("profiles").select("handle,display_name,trust_temp").eq("id", user.id).maybeSingle()).data
    : null;

  return (
    <>
      <AppHeader title="MY" />
      {user ? (
        <div className="space-y-4 p-4">
          <div className="rounded-2xl bg-[#faf8f5] p-4">
            <p className="text-lg font-bold">{profile?.display_name ?? "사용자"}</p>
            <p className="text-sm text-neutral-500">@{profile?.handle} · {user.email ?? "카카오 계정"}</p>
            <p className="mt-2 text-sm">
              신뢰도 온도 <b className="text-accent">{Number(profile?.trust_temp ?? 36.5).toFixed(1)}℃</b>
            </p>
          </div>
          {profile?.handle.startsWith("user_") && (
            <Link href="/me/edit" className="block rounded-xl bg-orange-50 p-3 text-sm">
              <b className="text-accent">프로필을 완성해 주세요</b>
              <br />
              <span className="text-neutral-600">이름·아이디·추구미를 정하면 다른 사람이 내 옷장을 찾기 쉬워져요.</span>
            </Link>
          )}
          {profile && (
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/u/${profile.handle}`} className="rounded-xl border border-neutral-200 p-3 text-center text-sm font-medium">
                내 옷장 보기
              </Link>
              <Link href="/me/edit" className="rounded-xl border border-neutral-200 p-3 text-center text-sm font-medium">
                프로필 편집
              </Link>
            </div>
          )}
          <form action={signOut}>
            <button className="text-sm text-neutral-500 underline">로그아웃</button>
          </form>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="mb-4 text-sm text-neutral-500">로그인하고 옷장을 열어보세요.</p>
          <Link href="/login?next=/me" className="inline-block rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white">
            로그인
          </Link>
        </div>
      )}
    </>
  );
}
