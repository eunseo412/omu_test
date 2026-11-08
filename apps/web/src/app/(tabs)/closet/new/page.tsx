import { AppHeader } from "@/components/layout/app-header";
import { ItemForm } from "@/features/closet/components/item-form";

export const metadata = { title: "옷 등록" };

export default function NewItemPage() {
  return (
    <>
      <AppHeader title="옷 등록" />
      <ItemForm />
    </>
  );
}
