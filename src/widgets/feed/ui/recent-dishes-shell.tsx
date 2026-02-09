import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";

const PLACEHOLDER_DISH_COUNT = 6;

function RecentDishesShell() {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Recent Dishes"
        description="Browse creations in a card grid optimized for desktop and mobile."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_DISH_COUNT }, (_, index) => (
          <Surface
            key={`placeholder-dish-${index + 1}`}
            className="overflow-hidden p-0"
            interactive="border"
            radius="2xl"
            tone="cardMuted"
          >
            <div className="h-44 w-full bg-gradient-to-br from-primary/20 via-card to-black/70" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/10" />
            </div>
          </Surface>
        ))}
      </div>
    </section>
  );
}

export { RecentDishesShell };
