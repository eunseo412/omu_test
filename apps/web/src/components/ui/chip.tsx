/** 선택형 칩 (등록·프로필 편집·대여 신청). 얇은 사각 테두리 / 선택: 검정 */
export const chipClass = (on: boolean) =>
  `shrink-0 rounded-md px-3 py-1.5 text-[14px] transition-colors ${
    on ? "bg-neutral-900 text-white" : "text-neutral-700 ring-1 ring-inset ring-neutral-300"
  }`;

export function Chip({ on, onClick, children, type = "button" }: { on: boolean; onClick?: () => void; children: React.ReactNode; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} aria-pressed={on} className={chipClass(on)}>
      {children}
    </button>
  );
}
