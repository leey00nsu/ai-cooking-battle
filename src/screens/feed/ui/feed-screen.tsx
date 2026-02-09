import { FeedHeaderShell } from "@/widgets/feed/ui/feed-header-shell";
import { FeedSpotlightShell } from "@/widgets/feed/ui/feed-spotlight-shell";
import { RecentDishesShell } from "@/widgets/feed/ui/recent-dishes-shell";

export default function FeedScreen() {
  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <FeedHeaderShell />
        <div className="grid grid-cols-1 gap-8">
          <FeedSpotlightShell />
          <RecentDishesShell />
        </div>
      </main>
    </div>
  );
}
