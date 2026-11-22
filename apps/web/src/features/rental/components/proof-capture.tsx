"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Plus, RotateCcw } from "lucide-react";
import { PROOF_SHOTS, PROOF_SHOT_GUIDES, PROOF_SHOT_LABELS, type ProofShot } from "@omu/core";
import { createClient } from "@/lib/supabase/client";
import { rentalCode, stampProofImage } from "@/lib/proof-image";
import { getServerNow } from "../actions";

type Slot = { status: "empty" | "uploading" | "done" | "error"; preview?: string; path?: string; error?: string };
export type ProofState = { paths: string[]; ready: boolean; uploading: boolean };

const STALE_MS = 10 * 60 * 1000; // 10분보다 오래된 사진 파일은 '방금 찍은 사진'이 아니다

/**
 * 상태 기록 촬영: 앞면 → 뒷면 → 라벨 순서 안내, 찍는 즉시 각인 + 업로드.
 * required=false 면 필수 컷 없이 '추가 사진'만 (받은 상태 확인에서 다른 점을 남길 때).
 */
export function ProofCapture({
  rentalId, myId, required = true, onChange,
}: { rentalId: string; myId: string; required?: boolean; onChange: (s: ProofState) => void }) {
  const [slots, setSlots] = useState<Record<string, Slot>>(() =>
    Object.fromEntries((required ? PROOF_SHOTS : []).map((s) => [s, { status: "empty" } as Slot])),
  );
  const [extras, setExtras] = useState<Slot[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const clockOffset = useRef(0); // 서버 시각 - 휴대폰 시각
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    getServerNow().then((iso) => (clockOffset.current = Date.parse(iso) - Date.now())).catch(() => {});
  }, []);

  // 부모에게 현재 상태 알리기
  useEffect(() => {
    const all = [...Object.values(slots), ...extras];
    onChange({
      paths: all.filter((s) => s.status === "done" && s.path).map((s) => s.path!),
      ready: Object.values(slots).every((s) => s.status === "done"),
      uploading: all.some((s) => s.status === "uploading"),
    });
  }, [slots, extras, onChange]);

  /** 갤러리의 예전 사진은 받지 않는다 (카메라로 방금 찍은 사진만) */
  function isFresh(file: File) {
    if (Date.now() - file.lastModified <= STALE_MS) return true;
    setWarning("방금 찍은 사진만 올릴 수 있어요. 카메라로 다시 찍어주세요.");
    return false;
  }

  async function capture(shot: ProofShot, file: File, extraIndex?: number) {
    setWarning(null);
    const preview = URL.createObjectURL(file);
    const set = (s: Slot) =>
      shot === "extra"
        ? setExtras((cur) => cur.map((x, i) => (i === extraIndex ? s : x)))
        : setSlots((cur) => ({ ...cur, [shot]: s }));
    set({ status: "uploading", preview });
    try {
      const blob = await stampProofImage(file, {
        rentalCode: rentalCode(rentalId),
        at: new Date(Date.now() + clockOffset.current),
        shotLabel: PROOF_SHOT_LABELS[shot],
      });
      const path = `${myId}/${rentalId}/${shot}-${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("rental-proofs").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      set({ status: "done", preview, path });
    } catch (e) {
      set({ status: "error", preview, error: e instanceof Error ? e.message : "업로드 실패" });
    }
  }

  const nextShot = (required ? PROOF_SHOTS : []).find((s) => slots[s]?.status !== "done" && slots[s]?.status !== "uploading");

  return (
    <div className="space-y-3">
      {required && (
        <div className="grid grid-cols-3 gap-2">
          {PROOF_SHOTS.map((shot, i) => {
            const s = slots[shot];
            const isNext = shot === nextShot;
            return (
              <button
                key={shot}
                type="button"
                onClick={() => inputs.current[shot]?.click()}
                className={`relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-xl text-center ${
                  s.preview ? "" : isNext ? "bg-neutral-900 text-white" : "bg-surface text-neutral-500"
                }`}
              >
                {s.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기
                  <img src={s.preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <Camera className="h-6 w-6" strokeWidth={1.6} />
                    <span className="mt-1 text-[13px] font-bold">{i + 1}. {PROOF_SHOT_LABELS[shot]}</span>
                    <span className={`mt-0.5 px-1.5 text-[10px] leading-tight ${isNext ? "text-white/70" : "text-muted"}`}>{PROOF_SHOT_GUIDES[shot]}</span>
                  </>
                )}
                {s.preview && (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[11px] font-semibold text-white">
                    {s.status === "uploading" && <><Loader2 className="h-3 w-3 animate-spin" /> 올리는 중</>}
                    {s.status === "done" && <><Check className="h-3 w-3" /> {PROOF_SHOT_LABELS[shot]} · 다시 찍기</>}
                    {s.status === "error" && <><RotateCcw className="h-3 w-3" /> 실패 · 다시 찍기</>}
                  </span>
                )}
                <input
                  ref={(el) => { inputs.current[shot] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && isFresh(f)) capture(shot, f);
                    e.target.value = "";
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {required && nextShot && (
        <button
          type="button"
          onClick={() => inputs.current[nextShot]?.click()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface text-[14px] font-semibold"
        >
          <Camera className="h-4 w-4" /> {PROOF_SHOT_LABELS[nextShot]} 찍기 <span className="font-normal text-muted">· {PROOF_SHOT_GUIDES[nextShot]}</span>
        </button>
      )}

      {/* 흠집·얼룩 등 추가 사진 (선택) */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {extras.map((s, i) => (
          <div key={i} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 */}
            {s.preview && <img src={s.preview} alt="" className="h-full w-full object-cover" />}
            {s.status === "uploading" && <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-white" />}
            {s.status === "error" && <span className="absolute inset-x-0 bottom-0 bg-red-600 text-center text-[10px] text-white">실패</span>}
          </div>
        ))}
        {extras.length < 4 && (
          <button
            type="button"
            onClick={() => inputs.current.extra?.click()}
            className="flex h-20 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] text-neutral-600 ring-1 ring-inset ring-neutral-300"
          >
            <Plus className="h-4 w-4" /> {required ? "흠집·얼룩 추가 (선택)" : "다른 점 사진 찍기"}
          </button>
        )}
        <input
          ref={(el) => { inputs.current.extra = el; }}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && isFresh(f)) {
              const index = extras.length;
              setExtras((cur) => [...cur, { status: "uploading" }]);
              capture("extra", f, index);
            }
            e.target.value = "";
          }}
        />
      </div>

      {warning && <p className="text-[13px] text-red-600">{warning}</p>}
      <p className="text-[11px] leading-relaxed text-muted">
        사진에는 거래 번호와 촬영 시각(서버 기준)이 새겨지고, 거래가 끝나고 30일 동안 보관돼요. 올린 사진은 지울 수 없어요.
      </p>
    </div>
  );
}
