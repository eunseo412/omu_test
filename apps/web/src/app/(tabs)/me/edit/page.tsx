import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getMyProfileForEdit } from "@/features/profile/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "프로필 편집" };

export default async function EditProfilePage() {
  const me = await getMyProfileForEdit();
  if (!me) redirect("/login?next=/me/edit");
  return (
    <>
      <AppHeader title="프로필 편집" />
      <ProfileForm initial={me} />
    </>
  );
}
