/** 선택형 칩. 선택: 검정 / 기본: 연회색 면 */
export const chipClass = (on: boolean) =>
  `shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
    on ? "bg-neutral-900 text-white" : "bg-surface text-neutral-700"
  }`;

export function Chip({ on, onClick, children, type = "button" }: { on: boolean; onClick?: () => void; children: React.ReactNode; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} aria-pressed={on} className={chipClass(on)}>
      {children}
    </button>
  );
}
