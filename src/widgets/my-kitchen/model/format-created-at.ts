const createdAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "알 수 없음";
  }
  return createdAtFormatter.format(date);
}

export { formatCreatedAt };
