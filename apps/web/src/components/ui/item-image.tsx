import Image from "next/image";
import { Shirt } from "lucide-react";

/** 옷 사진을 영역에 꽉 채워 보여준다. 사진이 없으면 톤 배경 + 아이콘 */
export function ItemImage({
  src, alt, tone = "#e9e6e1", sizes = "50vw", priority = false, className = "",
}: { src: string | null; alt: string; tone?: string; sizes?: string; priority?: boolean; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: tone }}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Shirt className="h-1/3 w-1/3 text-white/40" strokeWidth={1} aria-hidden />
        </div>
      )}
    </div>
  );
}
