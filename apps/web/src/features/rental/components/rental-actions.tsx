"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { availableTransitions, type RentalStatus } from "@omu/core";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { transitionRental } from "../actions";

type Role = "owner" | "renter";
type Kind = "primary" | "secondary" | "text";
type ActionDef = {
  label: string;
  kind: Kind;
  confirm?: string; // 바로 실행 전 확인 문구
  sheet?: { title: string; desc: string; photos: boolean; noteRequired?: boolean; notePlaceholder: string };
};

function actionFor(to: RentalStatus, role: Role): ActionDef | null {
  switch (to) {
    case "accepted":
      return { label: "수락하기", kind: "primary", confirm: "이 신청을 수락할까요? 같은 기간의 다른 신청은 받을 수 없게 돼요." };
    case "rejected":
      return { label: "거절", kind: "secondary", confirm: "이 신청을 거절할까요?" };
    case "cancelled":
      return { label: role === "renter" ? "신청 취소" : "거래 취소", kind: "text", confirm: "거래를 취소할까요?" };
    case "handed_over":
      return {
        label: "옷 전달 완료",
        kind: "primary",
        sheet: {
          title: "옷을 전달했나요?",
          desc: "전달할 때의 옷 상태 사진을 남겨두면 반납 확인과 분쟁 때 도움이 돼요.",
          photos: true,
          notePlaceholder: "예) 대여료·보증금 받음, 오른쪽 소매에 원래 있던 작은 얼룩",
        },
      };
    case "returned":
      return {
        label: role === "renter" ? "반납했어요" : "반납 받았어요",
        kind: "primary",
        sheet: {
          title: role === "renter" ? "옷을 반납했나요?" : "옷을 돌려받았나요?",
          desc: "반납할 때의 옷 상태 사진을 남겨주세요.",
          photos: true,
          notePlaceholder: "예) 학생회관 앞에서 전달했어요",
        },
      };
    case "completed":
      return {
        label: "반납 승인",
        kind: "primary",
        confirm: "옷 상태를 확인했고 보증금을 돌려드렸나요? 승인하면 거래가 완료돼요.",
      };
    case "disputed":
      return {
        label: "문제 있어요",
        kind: "secondary",
        sheet: {
          title: "어떤 문제가 있나요?",
          desc: "파손·오염·구성품 누락 등 문제를 사진과 함께 남겨주세요. 운영팀이 확인해요.",
          photos: true,
          noteRequired: true,
          notePlaceholder: "예) 앞판에 커피 얼룩이 생겼어요",
        },
      };
    default:
      return null;
  }
}

const btn: Record<Kind, string> = {
  primary: "h-12 flex-1 rounded-xl bg-neutral-900 text-[15px] font-semibold text-white",
  secondary: "h-12 flex-1 rounded-xl border border-neutral-300 text-[15px] font-semibold",
  text: "w-full py-2 text-[13px] text-neutral-500 underline",
};

export function RentalActions({ rentalId, status, role, myId }: { rentalId: string; status: RentalStatus; role: Role; myId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetFor, setSheetFor] = useState<RentalStatus | null>(null);

  const actions = availableTransitions(status, role)
    .map((to) => ({ to, def: actionFor(to, role) }))
    .filter((a): a is { to: RentalStatus; def: ActionDef } => a.def !== null);
  if (actions.length === 0) return null;

  async function run(to: RentalStatus, note: string | null, photoPaths: string[]) {
    setBusy(true);
    setError(null);
    const res = await transitionRental(rentalId, to, note, photoPaths);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setSheetFor(null);
    router.refresh();
    return true;
  }

  function click(to: RentalStatus, def: ActionDef) {
    if (def.sheet) return setSheetFor(to);
    if (def.confirm && !window.confirm(def.confirm)) return;
    run(to, null, []);
  }

  const main = actions.filter((a) => a.def.kind !== "text");
  const minor = actions.filter((a) => a.def.kind === "text");
  const sheet = sheetFor ? actions.find((a) => a.to === sheetFor) : null;

  return (
    <div className="space-y-1">
      {main.length > 0 && (
        <div className="flex gap-2">
          {[...main].sort((a, b) => (a.def.kind === "secondary" ? -1 : 0) - (b.def.kind === "secondary" ? -1 : 0)).map(({ to, def }) => (
            <button key={to} disabled={busy} onClick={() => click(to, def)} className={`${btn[def.kind]} disabled:opacity-50`}>
              {def.label}
            </button>
          ))}
        </div>
      )}
      {minor.map(({ to, def }) => (
        <button key={to} disabled={busy} onClick={() => click(to, def)} className={btn.text}>
          {def.label}
        </button>
      ))}
      {error && !sheet && <p className="text-center text-[13px] text-red-600">{error}</p>}
      {sheet?.def.sheet && (
        <ProofSheet
          rentalId={rentalId}
          myId={myId}
          sheet={sheet.def.sheet}
          confirmLabel={sheet.def.label}
          busy={busy}
          error={error}
          onClose={() => { setSheetFor(null); setError(null); }}
          onSubmit={(note, paths) => run(sheet.to, note, paths)}
        />
      )}
    </div>
  );
}

function ProofSheet({
  rentalId, myId, sheet, confirmLabel, busy, error, onClose, onSubmit,
}: {
  rentalId: string;
  myId: string;
  sheet: NonNullable<ActionDef["sheet"]>;
  confirmLabel: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (note: string | null, paths: string[]) => Promise<boolean>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    setLocalError(null);
    if (sheet.noteRequired && !note.trim()) return setLocalError("내용을 적어주세요.");
    const supabase = createClient();
    const paths: string[] = [];
    try {
      setUploading(true);
      for (const f of files) {
        const blob = await compressImage(f.file, 1600, 0.85);
        const path = `${myId}/${rentalId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("rental-proofs").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        paths.push(path);
      }
    } catch (e) {
      if (paths.length) await supabase.storage.from("rental-proofs").remove(paths);
      setUploading(false);
      return setLocalError(e instanceof Error ? `사진 업로드 실패: ${e.message}` : "사진 업로드 실패");
    }
    setUploading(false);
    const ok = await onSubmit(note.trim() || null, paths);
    if (!ok && paths.length) await supabase.storage.from("rental-proofs").remove(paths);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="pb-safe w-full max-w-[480px] rounded-t-3xl bg-white px-5 pt-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-[18px] font-bold">{sheet.title}</h3>
          <button onClick={onClose} aria-label="닫기" className="p-1"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-[13px] text-neutral-500">{sheet.desc}</p>

        {sheet.photos && (
          <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
            {files.length < 6 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-500"
              >
                <Camera className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[11px]">사진 {files.length}/6</span>
              </button>
            )}
            {files.map((f, i) => (
              <div key={f.url} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 */}
                <img src={f.url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setFiles((c) => c.filter((_, k) => k !== i))}
                  aria-label="사진 삭제"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const add = [...(e.target.files ?? [])].slice(0, 6 - files.length).map((file) => ({ file, url: URL.createObjectURL(file) }));
                setFiles((c) => [...c, ...add]);
                e.target.value = "";
              }}
            />
          </div>
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={sheet.notePlaceholder + (sheet.noteRequired ? "" : " (선택)")}
          className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-[14px] outline-none focus:border-neutral-900"
        />
        {(localError || error) && <p className="mt-2 text-center text-[13px] text-red-600">{localError ?? error}</p>}
        <button
          onClick={submit}
          disabled={busy || uploading}
          className="my-4 h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {uploading ? "사진 올리는 중…" : busy ? "처리 중…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
