/**
 * 상태 기록 사진: 줄이고(JPEG) 아래쪽에 '서비스 · 거래 번호 · 시각 · 컷'을 새긴다.
 * 사진을 다른 거래에 재사용하거나, 찍은 시점을 속이는 것을 어렵게 하려는 표시.
 */
export async function stampProofImage(
  file: File,
  { rentalCode, at, shotLabel }: { rentalCode: string; at: Date; shotLabel: string },
  maxSide = 1440,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.032));
  const band = Math.round(fontSize * 2.1);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, h - band, w, band);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${fontSize}px -apple-system, "Pretendard Variable", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  const text = `O:MU 상태 기록 · 거래 #${rentalCode} · ${formatKST(at)} · ${shotLabel}`;
  ctx.fillText(text, Math.round(fontSize * 0.7), h - band / 2, w - fontSize * 1.4);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/jpeg", 0.85),
  );
}

/** 2026.11.22 14:03 KST */
export function formatKST(d: Date): string {
  const p = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}.${g("month")}.${g("day")} ${g("hour")}:${g("minute")} KST`;
}

/** 거래 번호 표시용 짧은 코드 */
export const rentalCode = (rentalId: string) => rentalId.replace(/-/g, "").slice(0, 8).toUpperCase();
