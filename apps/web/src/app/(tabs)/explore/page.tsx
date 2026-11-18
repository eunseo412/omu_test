import { redirect } from "next/navigation";

// 탐색은 홈으로 합쳐졌다. 예전 링크(/explore?tag=...)는 홈으로 넘긴다.
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  redirect(tag ? `/?tag=${encodeURIComponent(tag)}` : "/");
}
