import { ForgotPassword } from "@/features/auth/components/forgot-password";
import { PasswordLogin } from "@/features/auth/components/password-login";
import { LoginButtons } from "@/features/auth/components/login-buttons";
import { LoginError } from "@/features/auth/components/login-error";
import { Wordmark } from "@/components/ui/wordmark";

export const metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <main className="flex min-h-dvh flex-col bg-white px-6">
      <div className="flex flex-1 flex-col justify-center">
        <Wordmark className="text-[48px] leading-none" />
        <p className="mt-6 text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em]">
          오늘은 누구의 분위기를
          <br />
          입어볼까요?
        </p>
        <p className="mt-2 text-[14px] text-muted">닮고 싶은 사람의 옷장에서 빌려 입어요.</p>
      </div>
      <div className="pb-safe mb-10 space-y-3">
        <LoginError error={error} />
        <PasswordLogin next={safeNext} />
        <ForgotPassword next={safeNext} />
        <div className="flex items-center gap-3 py-1 text-[12px] text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          또는
          <span className="h-px flex-1 bg-neutral-200" />
        </div>
        <LoginButtons next={safeNext} />
        <p className="text-center text-[11px] text-neutral-400">계속하면 이용약관 및 개인정보처리방침에 동의하게 됩니다.</p>
      </div>
    </main>
  );
}
