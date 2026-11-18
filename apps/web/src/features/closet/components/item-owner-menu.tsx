"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { deleteItem, setItemHidden } from "../actions";

/** 내 옷 상세 화면 오른쪽 위 ⋯ 메뉴: 수정 · 숨기기 · 삭제 */
export function ItemOwnerMenu({ itemId, hidden, ownerHandle }: { itemId: string; hidden: boolean; ownerHandle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleHidden() {
    start(async () => {
      setError(null);
      const res = await setItemHidden(itemId, !hidden);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("이 옷을 삭제할까요? 삭제하면 되돌릴 수 없고, 수락 대기 중인 신청은 자동으로 취소돼요.")) return;
    start(async () => {
      setError(null);
      const res = await deleteItem(itemId);
      if (!res.ok) return setError(res.error);
      router.replace(`/u/${ownerHandle}`);
      router.refresh();
    });
  }

  const row = "flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-medium active:bg-surface disabled:opacity-50";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="내 옷 관리"
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+12px)] rounded-full bg-white/90 p-2 backdrop-blur"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => !pending && setOpen(false)}>
          <div className="pb-safe w-full max-w-[480px] rounded-t-3xl bg-white px-3 pb-3 pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between px-3">
              <h3 className="text-[17px] font-bold">내 옷 관리</h3>
              <button onClick={() => setOpen(false)} aria-label="닫기" className="p-1"><X className="h-5 w-5" /></button>
            </div>
            <Link href={`/items/${itemId}/edit`} className={row}>
              <Pencil className="h-5 w-5" strokeWidth={1.8} /> 정보·사진 수정
            </Link>
            <button onClick={toggleHidden} disabled={pending} className={row}>
              {hidden ? <Eye className="h-5 w-5" strokeWidth={1.8} /> : <EyeOff className="h-5 w-5" strokeWidth={1.8} />}
              <span>
                {hidden ? "다시 보이기" : "숨기기"}
                <span className="block text-[12px] font-normal text-muted">
                  {hidden ? "다른 사람이 다시 보고 빌릴 수 있어요" : "잠시 빌려주기 어려울 때. 나만 볼 수 있어요"}
                </span>
              </span>
            </button>
            <button onClick={remove} disabled={pending} className={`${row} text-red-600`}>
              <Trash2 className="h-5 w-5" strokeWidth={1.8} /> 삭제
            </button>
            {error && <p className="px-3 pb-2 text-[13px] text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
