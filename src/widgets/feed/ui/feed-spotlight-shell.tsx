import { EmptyState } from "@/shared/ui/empty-state";
import { Pill } from "@/shared/ui/pill";
import { Surface } from "@/shared/ui/surface";

function FeedSpotlightShell() {
  return (
    <Surface
      className="relative overflow-hidden border-primary/35 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8"
      radius="3xl"
      shadow="glowSm"
      tone="card"
    >
      <div className="space-y-4">
        <Pill size="xs" style="outline" tone="amber">
          Latest Dish Spotlight
        </Pill>
        <EmptyState
          title="Spotlight dish will appear here"
          description="Next task will bind this section to real feed data."
        />
      </div>
    </Surface>
  );
}

export { FeedSpotlightShell };
