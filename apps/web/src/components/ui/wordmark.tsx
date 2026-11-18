/** 서비스 로고 글자. 디자인 시안처럼 굵은 검정 대문자 */
export function Wordmark({ className = "text-[26px]" }: { className?: string }) {
  return <span className={`font-black tracking-[-0.04em] ${className}`}>O:MU</span>;
}
