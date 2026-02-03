const DEFAULT_TIME_ZONE = "Asia/Seoul";

const formatTwoDigit = (value: number) => String(value).padStart(2, "0");

export const formatDayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = formatTwoDigit(date.getMonth() + 1);
  const day = formatTwoDigit(date.getDate());
  return `${year}-${month}-${day}`;
};

export const formatDayKeyForTimeZone = (timeZone: string, date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
};

export const formatDayKeyForKST = (date = new Date()) =>
  formatDayKeyForTimeZone(DEFAULT_TIME_ZONE, date);
