import Link from "next/link";
import type { DishFeedItem } from "@/entities/feed/model/types";
import { EmptyState } from "@/shared/ui/empty-state";
import { MediaDimmer } from "@/shared/ui/media-dimmer";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";

type RecentDishesShellProps = {
  items: DishFeedItem[];
};

const createdAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return createdAtFormatter.format(date);
}

function RecentDishesShell({ items }: RecentDishesShellProps) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Recent Dishes"
        description="Browse creations in a card grid optimized for desktop and mobile."
      />
      {items.length === 0 ? (
        <Surface className="p-6 md:p-8" radius="2xl" tone="cardMuted">
          <EmptyState
            title="No recent dishes yet"
            description="Today's dishes are still being generated."
          />
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Surface
              key={item.id}
              asChild
              className="group overflow-hidden p-0"
              interactive="border"
              radius="2xl"
              tone="cardMuted"
            >
              <Link href={`/dishes/${item.id}`} aria-label={`${item.prompt} detail page`}>
                <article>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      alt={`Dish image: ${item.prompt}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={item.imageUrl}
                    />
                    <MediaDimmer tone="card" />
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="line-clamp-2 text-base font-bold text-white">{item.prompt}</h3>
                    <p className="text-xs text-white/65">
                      {item.authorLabel} · {formatCreatedAt(item.createdAt)}
                    </p>
                  </div>
                </article>
              </Link>
            </Surface>
          ))}
        </div>
      )}
    </section>
  );
}

export { RecentDishesShell };
