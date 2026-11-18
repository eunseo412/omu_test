import { AppHeader } from "@/components/layout/app-header";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";

export const metadata = { title: "비밀번호 설정" };

export default function PasswordPage() {
  return (
    <>
      <AppHeader title="비밀번호 설정" back="/me" right={null} />
      <SetPasswordForm />
    </>
  );
}
