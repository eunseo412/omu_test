import { AppHeader } from "@/components/layout/app-header";

// 홈: 팔로우한 사람들의 새 옷·착장 피드 (features/feed)
export default function HomePage() {
  return (
    <>
      <AppHeader title="O:MU" />
      <section className="p-4">
        <p className="text-sm text-neutral-500">팔로우한 옷장의 새 소식이 여기에 표시됩니다.</p>
      </section>
    </>
  );
}
