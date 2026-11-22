"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PROOF_SHOTS, PROOF_SHOT_LABELS, type ProofShot } from "@omu/core";
import { ProofCapture, type ProofState } from "./proof-capture";

function Sheet({ title, desc, onClose, children }: { title: string; desc: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="pb-safe max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white px-5 pt-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-[18px] font-bold">{title}</h3>
          <button onClick={onClose} aria-label="닫기" className="p-1"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-[13px] text-muted">{desc}</p>
        {children}
      </div>
    </div>
  );
}

/** 전달·반납: 앞면·뒷면·라벨 3컷을 다 찍어야 완료 버튼이 켜진다 */
export function RequiredProofSheet({
  rentalId, myId, title, desc, confirmLabel, notePlaceholder, busy, error, onClose, onSubmit,
}: {
  rentalId: string; myId: string; title: string; desc: string; confirmLabel: string; notePlaceholder: string;
  busy: boolean; error: string | null; onClose: () => void; onSubmit: (note: string | null, paths: string[]) => void;
}) {
  const [proof, setProof] = useState<ProofState>({ paths: [], ready: false, uploading: false });
  const [note, setNote] = useState("");
  const remaining = 3 - proof.paths.filter((p) => !p.includes("/extra-")).length;

  return (
    <Sheet title={title} desc={desc} onClose={onClose}>
      <ProofCapture rentalId={rentalId} myId={myId} onChange={setProof} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={`${notePlaceholder} (선택)`}
        className="mt-3 w-full resize-none rounded-xl bg-surface p-3 text-[14px] outline-none focus:ring-2 focus:ring-neutral-900/10"
      />
      {error && <p className="mt-2 text-center text-[13px] text-red-600">{error}</p>}
      <button
        onClick={() => onSubmit(note.trim() || null, proof.paths)}
        disabled={!proof.ready || proof.uploading || busy}
        className="my-4 h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {busy ? "처리 중…" : proof.uploading ? "사진 올리는 중…" : proof.ready ? confirmLabel : `필수 사진 ${Math.max(remaining, 0)}장 남았어요`}
      </button>
    </Sheet>
  );
}

/** 받은 상태 확인: 주인이 찍은 사진을 보고 한 번에 확인. 다른 점이 있을 때만 사진·메모 */
export function ReceiptSheet({
  rentalId, myId, handoverPhotos, busy, error, onClose, onSubmit,
}: {
  rentalId: string; myId: string; handoverPhotos: { url: string; shot: ProofShot }[];
  busy: boolean; error: string | null; onClose: () => void; onSubmit: (note: string | null, paths: string[]) => void;
}) {
  const [different, setDifferent] = useState(false);
  const [proof, setProof] = useState<ProofState>({ paths: [], ready: true, uploading: false });
  const [note, setNote] = useState("");
  const ordered = [
    ...PROOF_SHOTS.flatMap((s) => handoverPhotos.filter((p) => p.shot === s)),
    ...handoverPhotos.filter((p) => p.shot === "extra"),
  ];

  return (
    <Sheet title="받은 옷 상태를 확인해 주세요" desc="주인이 전달 직전에 찍은 사진이에요. 받은 옷과 같은지 비교해 주세요." onClose={onClose}>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        {ordered.length ? (
          ordered.map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- 서명된 URL */}
              <img src={p.url} alt={PROOF_SHOT_LABELS[p.shot]} className="h-40 w-32 rounded-xl object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">{PROOF_SHOT_LABELS[p.shot]}</span>
            </a>
          ))
        ) : (
          <p className="text-[13px] text-muted">전달 사진이 없는 거래예요.</p>
        )}
      </div>

      {different ? (
        <div className="mt-4 rounded-2xl ring-1 ring-inset ring-line p-3">
          <p className="mb-2 text-[13px] font-semibold">다른 점을 남겨주세요</p>
          <ProofCapture rentalId={rentalId} myId={myId} required={false} onChange={setProof} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="예) 왼쪽 소매에 사진에 없는 얼룩이 있어요"
            className="mt-2 w-full resize-none rounded-xl bg-surface p-3 text-[14px] outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setDifferent(true)} className="mt-3 text-[13px] text-muted underline">
          사진과 다른 점이 있어요
        </button>
      )}

      {error && <p className="mt-2 text-center text-[13px] text-red-600">{error}</p>}
      <button
        onClick={() => onSubmit(different ? note.trim() || null : null, different ? proof.paths : [])}
        disabled={busy || proof.uploading || (different && !note.trim() && proof.paths.length === 0)}
        className="my-4 h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {busy ? "처리 중…" : different ? "다른 점을 남기고 받기" : "이 상태로 받았어요"}
      </button>
    </Sheet>
  );
}
