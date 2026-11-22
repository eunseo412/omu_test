import { PROOF_SHOTS, PROOF_SHOT_LABELS, type ProofShot } from "@omu/core";

type Photo = { url: string; shot: ProofShot };

/** 전달 때 vs 반납 때 사진을 컷별로 나란히 (반납 승인·분쟁 판단용) */
export function ProofCompare({ before, after }: { before: Photo[]; after: Photo[] }) {
  const pick = (list: Photo[], shot: ProofShot) => list.find((p) => p.shot === shot);
  const extras = [...before.filter((p) => p.shot === "extra"), ...after.filter((p) => p.shot === "extra")];
  return (
    <section className="mx-4 mt-3 rounded-2xl ring-1 ring-inset ring-line p-4">
      <h2 className="text-[15px] font-bold">상태 비교</h2>
      <p className="mb-3 text-[12px] text-muted">전달 직전과 반납 직전에 찍은 사진이에요. 컷별로 비교해 보세요.</p>
      <div className="grid grid-cols-[40px_1fr_1fr] items-center gap-2 text-center text-[11px] text-muted">
        <span />
        <span>전달 때</span>
        <span>반납 때</span>
        {PROOF_SHOTS.map((shot) => (
          <Row key={shot} label={PROOF_SHOT_LABELS[shot]} a={pick(before, shot)} b={pick(after, shot)} />
        ))}
      </div>
      {extras.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-semibold text-neutral-700">추가로 남긴 사진</p>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {extras.map((p) => (
              <Thumb key={p.url} photo={p} className="h-20 w-16 shrink-0" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, a, b }: { label: string; a?: Photo; b?: Photo }) {
  return (
    <>
      <span className="text-[12px] font-semibold text-neutral-700">{label}</span>
      {a ? <Thumb photo={a} className="aspect-[3/4] w-full" /> : <Empty />}
      {b ? <Thumb photo={b} className="aspect-[3/4] w-full" /> : <Empty />}
    </>
  );
}

function Thumb({ photo, className }: { photo: Photo; className: string }) {
  return (
    <a href={photo.url} target="_blank" rel="noreferrer" className={`block overflow-hidden rounded-lg bg-surface ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 만료되는 서명 URL */}
      <img src={photo.url} alt={PROOF_SHOT_LABELS[photo.shot]} className="h-full w-full object-cover" />
    </a>
  );
}

function Empty() {
  return <span className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-surface text-[11px]">사진 없음</span>;
}
