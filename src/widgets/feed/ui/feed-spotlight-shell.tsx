"use client";

import Link from "next/link";
import type { DishFeedItem } from "@/entities/feed/model/types";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { EmptyState } from "@/shared/ui/empty-state";
import { MediaDimmer } from "@/shared/ui/media-dimmer";
import { Pill } from "@/shared/ui/pill";
import { Surface } from "@/shared/ui/surface";

type FeedSpotlightShellProps = {
  item: DishFeedItem | null;
};

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function FeedSpotlightShell({ item }: FeedSpotlightShellProps) {
  if (!item) {
    return (
      <Surface className="p-6 md:p-8" radius="3xl" tone="card">
        <EmptyState
          title="스포트라이트 요리를 준비 중입니다."
          description="잠시 후 다시 확인해주세요."
        />
      </Surface>
    );
  }

  return (
    <Surface
      asChild
      className="group relative overflow-hidden border-primary/35 p-6 md:p-8"
      radius="3xl"
      shadow="glowSm"
      tone="card"
      interactive="borderAndBackground"
    >
      <Link
        href={`/dishes/${item.id}`}
        aria-label={`${item.prompt} detail page`}
        onClick={() =>
          trackEvent(ANALYTICS_EVENTS.FEED_ITEM_CLICKED, {
            screen: "feed",
            section: "spotlight",
            dayKey: formatDayKeyForKST(),
            dishId: item.id,
            authorType: item.authorType,
          })
        }
      >
        <img
          alt={`Spotlight dish image: ${item.prompt}`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          src={item.imageUrl}
        />
        <MediaDimmer tone="card" />

        <div className="relative space-y-4">
          <Pill size="xs" style="outline" tone="amber">
            Latest Dish Spotlight
          </Pill>
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-bold leading-tight text-white md:text-3xl">
              {item.prompt}
            </h2>
            <p className="text-sm text-white/75">
              {item.authorLabel} · {formatCreatedAt(item.createdAt)}
            </p>
          </div>
          <span className="inline-flex h-10 items-center justify-center rounded-[var(--radius-4xl)] bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
            View Dish
          </span>
        </div>
      </Link>
    </Surface>
  );
}

export { FeedSpotlightShell };
