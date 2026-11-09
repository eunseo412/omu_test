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

/** "방금", "5분 전", "3시간 전", "2일 전", 그 이상은 "11/12" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const sec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return formatDateTime(iso).split(" ")[0];
}
