import { Pill } from "@/shared/ui/pill";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";

const FILTER_ITEMS = [
  { label: "All Dishes", active: true },
  { label: "My Dishes", active: false },
  { label: "Exclude Bots", active: false },
  { label: "Search", active: false },
  { label: "Sort", active: false },
];

function FeedHeaderShell() {
  return (
    <div className="space-y-5">
      <SectionHeading
        title="Dish Feed"
        description="Latest creations from the AI Cooking Battle kitchen."
      />
      <Surface className="flex flex-wrap gap-2 p-3" radius="2xl" tone="soft">
        {FILTER_ITEMS.map((item) => (
          <Pill
            key={item.label}
            size="sm"
            style={item.active ? "soft" : "outline"}
            tone={item.active ? "amber" : "neutral"}
          >
            {item.label}
          </Pill>
        ))}
      </Surface>
    </div>
  );
}

export { FeedHeaderShell };
