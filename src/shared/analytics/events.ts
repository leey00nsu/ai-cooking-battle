export const ANALYTICS_EVENTS = {
  VIEW_HOME: "view_home",
  VIEW_THEME: "view_theme",
  VIEW_SNAPSHOT: "view_snapshot",
  START_CREATE: "start_create",
  MATCH_VIEW: "match_view",
  FEED_FILTER_CHANGED: "feed_filter_changed",
  FEED_ITEM_CLICKED: "feed_item_clicked",
  SNAPSHOT_ITEM_CLICKED: "snapshot_item_clicked",
  SCORE_READY: "score_ready",
  SCORE_FAILED: "score_failed",
  REPORT_SUBMITTED: "report_submitted",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
