/**
 * Supabase URL은 반드시 프로젝트 루트(https://xxx.supabase.co)여야 한다.
 * 대시보드에서 `.../rest/v1/` 같은 API 경로까지 복사하면 로그인 요청이
 * `/rest/v1/auth/v1/authorize`로 가서 "No API key found in request" 에러가 난다.
 * → 경로·공백·끝 슬래시를 제거하고 origin만 사용.
 */
function normalizeUrl(raw: string | undefined): string {
  const v = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  if (!v) return "";
  try {
    return new URL(v).origin;
  } catch {
    return v;
  }
}

// NEXT_PUBLIC_* 는 빌드 시 문자열로 치환되므로 process.env.XXX 형태로 직접 참조해야 한다
export const SUPABASE_URL = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim().replace(/^["']|["']$/g, "");
export const hasSupabase = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Storage 경로 → 공개 URL. 이미 http(s) URL이면 그대로 */
export function publicImageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}
