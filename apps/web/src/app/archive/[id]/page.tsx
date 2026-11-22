import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveEntryView } from "@/features/archive/components/archive-entry-view";
import { getArchiveEntry, markArchiveSeen } from "@/features/archive/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await getArchiveEntry((await params).id);
  return { title: e ? `${e.title} · @${e.collector.handle}의 mood archive` : "mood archive" };
}

export default async function ArchivePage({ params }: Props) {
  const { id } = await params;
  const e = await getArchiveEntry(id);
  if (!e) notFound();
  if (e.isNew) await markArchiveSeen(id);
  return <ArchiveEntryView e={e} />;
}
