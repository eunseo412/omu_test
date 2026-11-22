import { NextResponse } from "next/server";
import { PROOF_RETENTION_DAYS } from "@omu/core";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 상태 기록 사진 보관 기간 정리 (Vercel Cron, 매일 1회).
 * 거래가 끝나고(완료·취소·거절) 30일이 지난 거래의 상태 사진 파일을 지우고 proofs_purged_at을 기록한다.
 * 분쟁 중(disputed)인 거래는 끝나지 않았으므로 지우지 않는다.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 없음" }, { status: 500 });

  const cutoff = new Date(Date.now() - PROOF_RETENTION_DAYS * 86_400_000).toISOString();
  const { data: rentals, error } = await admin
    .from("rentals")
    .select("id,owner_id,renter_id,closed_at,updated_at")
    .in("status", ["completed", "cancelled", "rejected"])
    .is("proofs_purged_at", null)
    .lt("updated_at", cutoff)
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let purgedRentals = 0;
  let removedFiles = 0;
  for (const r of rentals ?? []) {
    if ((r.closed_at ?? r.updated_at) >= cutoff) continue;
    // 두 사람이 올린 사진 폴더: {uid}/{rentalId}/
    const paths: string[] = [];
    for (const uid of [r.owner_id, r.renter_id]) {
      const { data: files } = await admin.storage.from("rental-proofs").list(`${uid}/${r.id}`, { limit: 100 });
      for (const f of files ?? []) paths.push(`${uid}/${r.id}/${f.name}`);
    }
    if (paths.length) {
      const { error: rmError } = await admin.storage.from("rental-proofs").remove(paths);
      if (rmError) {
        console.error("[purge-proofs] 삭제 실패", r.id, rmError.message);
        continue;
      }
      removedFiles += paths.length;
    }
    await admin.from("rentals").update({ proofs_purged_at: new Date().toISOString() }).eq("id", r.id);
    purgedRentals++;
  }
  return NextResponse.json({ ok: true, purgedRentals, removedFiles });
}
