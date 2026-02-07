import type { MyKitchenDish } from "@/entities/kitchen/model/types";

type CollectionFilter = "all" | "ready" | "hidden" | "representative";

const COLLECTION_FILTERS: Array<{ key: CollectionFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "ready", label: "Battle Ready" },
  { key: "hidden", label: "Hidden" },
  { key: "representative", label: "Representative" },
];

function filterDishes(
  dishes: MyKitchenDish[],
  filter: CollectionFilter,
  representativeDishId: string | null,
) {
  if (filter === "all") {
    return dishes;
  }
  if (filter === "ready") {
    return dishes.filter((dish) => !dish.isHidden);
  }
  if (filter === "hidden") {
    return dishes.filter((dish) => dish.isHidden);
  }
  return dishes.filter((dish) => dish.id === representativeDishId);
}

export { COLLECTION_FILTERS, filterDishes };
export type { CollectionFilter };
