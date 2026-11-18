import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ItemForm } from "@/features/closet/components/item-form";
import { getItemForEdit } from "@/features/closet/queries";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "옷 정보 수정" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSupabase()) redirect(`/items/${id}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/items/${id}/edit`);

  const item = await getItemForEdit(id);
  if (!item) notFound();
  if (item === "not_mine") redirect(`/items/${id}`);

  return (
    <main>
      <AppHeader title="옷 정보 수정" back={`/items/${id}`} right={null} />
      <ItemForm initial={item} />
    </main>
  );
}
