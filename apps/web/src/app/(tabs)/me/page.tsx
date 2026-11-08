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
          {profile && (
            <Link href={`/u/${profile.handle}`} className="block rounded-xl border border-neutral-200 p-3 text-sm">
              내 옷장 보기
            </Link>
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
