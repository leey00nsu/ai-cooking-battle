export const ANALYTICS_EVENTS = {
  VIEW_HOME: "view_home",
  VIEW_THEME: "view_theme",
  VIEW_RANKING: "view_ranking",
  START_CREATE: "start_create",
  FEED_FILTER_CHANGED: "feed_filter_changed",
  FEED_ITEM_CLICKED: "feed_item_clicked",
  RANKING_ITEM_CLICKED: "ranking_item_clicked",
  SCORE_READY: "score_ready",
  SCORE_FAILED: "score_failed",
  REPORT_SUBMITTED: "report_submitted",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type AnalyticsPayloadSchema = {
  required: readonly string[];
  optional: readonly string[];
};

export const ANALYTICS_EVENT_PAYLOAD_SCHEMA: Partial<
  Record<AnalyticsEvent, AnalyticsPayloadSchema>
> = {
  [ANALYTICS_EVENTS.RANKING_ITEM_CLICKED]: {
    required: ["screen", "dayKey", "dishId"],
    optional: ["rank", "source"],
  },
};
