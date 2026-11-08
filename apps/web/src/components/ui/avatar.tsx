import Image from "next/image";

export function Avatar({ src, name, size = 72 }: { src: string | null; name: string; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-neutral-200"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold text-neutral-500" style={{ fontSize: size * 0.4 }}>
          {name.slice(0, 1)}
        </span>
      )}
    </div>
  );
}
