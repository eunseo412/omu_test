import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/features/profile/queries";
import { ProfileView } from "@/features/profile/components/profile-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)}의 옷장` };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await getProfile(decodeURIComponent(handle));
  if (!profile) notFound();
  return <ProfileView p={profile} />;
}
