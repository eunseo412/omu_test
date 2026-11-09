const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-11-12" → "11월 12일(목)" */
export function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEK[d.getUTCDay()]})`;
}

export function formatPeriod(start: string, end: string): string {
  return start === end ? formatDay(start) : `${formatDay(start)} ~ ${formatDay(end)}`;
}

/** ISO timestamp → "11/12 14:05" (한국 시간) */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("month")}/${g("day")} ${g("hour")}:${g("minute")}`;
}
