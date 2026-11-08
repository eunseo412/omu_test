import { LoginButtons } from "@/features/auth/components/login-buttons";

export const metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <main className="flex min-h-dvh flex-col bg-[#faf8f5] px-6">
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-[44px] font-black leading-none tracking-tighter">
          O<span className="text-accent">:</span>MU
        </p>
        <p className="mt-4 text-[22px] font-bold leading-snug">
          닮고 싶은 사람의 옷장에서
          <br />
          오늘의 mood를 빌려 입어요
        </p>
      </div>
      <div className="pb-safe mb-10 space-y-3">
        {error && <p className="text-center text-[13px] text-red-600">로그인에 실패했어요. 다시 시도해 주세요.</p>}
        <LoginButtons next={safeNext} />
        <p className="text-center text-[11px] text-neutral-400">계속하면 이용약관 및 개인정보처리방침에 동의하게 됩니다.</p>
      </div>
    </main>
  );
}
