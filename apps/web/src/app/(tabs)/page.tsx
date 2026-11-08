import { getHomeData } from "@/features/feed/queries";
import { HomeView } from "@/features/feed/components/home-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <HomeView data={await getHomeData()} />;
}
