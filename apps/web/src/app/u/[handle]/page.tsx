import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/features/profile/queries";
import { ProfileView } from "@/features/profile/components/profile-view";
import { getArchiveList } from "@/features/archive/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)}의 옷장` };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ handle }, { tab }] = await Promise.all([params, searchParams]);
  const profile = await getProfile(decodeURIComponent(handle));
  if (!profile) notFound();
  const archive = await getArchiveList(profile.id);
  return <ProfileView p={profile} tab={tab === "archive" ? "archive" : "closet"} archive={archive} />;
}
