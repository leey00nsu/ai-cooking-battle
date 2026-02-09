export const ANALYTICS_EVENTS = {
  VIEW_HOME: "view_home",
  VIEW_THEME: "view_theme",
  START_CREATE: "start_create",
  MATCH_VIEW: "match_view",
  FEED_FILTER_CHANGED: "feed_filter_changed",
  FEED_ITEM_CLICKED: "feed_item_clicked",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
