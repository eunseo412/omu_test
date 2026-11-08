"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { HANDLE_RE, ITEM_SIZES, STYLE_TAGS, profileInputSchema } from "@omu/core";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { updateProfile } from "../actions";

type Tag = (typeof STYLE_TAGS)[number];
type Size = (typeof ITEM_SIZES)[number];

export type ProfileFormInitial = {
  userId: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  avatarPublicUrl: string | null;
  style_tags: string[] | null;
  height_cm: number | null;
  top_size: string | null;
  bottom_size: string | null;
  shoe_size: number | null;
};

const inputCls =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[15px] outline-none placeholder:text-neutral-400 focus:border-neutral-900";
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

export function ProfileForm({ initial }: { initial: ProfileFormInitial }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  // 자동 생성된 기본값(user_xxx, 새 사용자)이면 빈칸으로 시작해 입력을 유도
  const isDefault = initial.handle.startsWith("user_");

  const [displayName, setDisplayName] = useState(initial.display_name === "새 사용자" ? "" : initial.display_name);
  const [handle, setHandle] = useState(isDefault ? "" : initial.handle);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [tags, setTags] = useState<Tag[]>((initial.style_tags ?? []) as Tag[]);
  const [height, setHeight] = useState(initial.height_cm?.toString() ?? "");
  const [topSize, setTopSize] = useState<Size | null>((initial.top_size as Size) ?? null);
  const [bottomSize, setBottomSize] = useState<Size | null>((initial.bottom_size as Size) ?? null);
  const [shoe, setShoe] = useState(initial.shoe_size?.toString() ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarPublicUrl);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleTag(t: Tag) {
    setTags((c) => (c.includes(t) ? c.filter((x) => x !== t) : c.length >= 5 ? c : [...c, t]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const input = {
      displayName,
      handle,
      bio,
      styleTags: tags,
      heightCm: numOrNull(height),
      topSize,
      bottomSize,
      shoeSize: numOrNull(shoe),
      avatarPath: initial.avatar_url,
    };
    const parsed = profileInputSchema.safeParse(input);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    setSaving(true);

    const supabase = createClient();
    let avatarPath = initial.avatar_url;
    let uploaded: string | null = null;
    try {
      if (avatarFile) {
        const blob = await compressImage(avatarFile, 512, 0.85);
        uploaded = `${initial.userId}/avatar-${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("avatars").upload(uploaded, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        avatarPath = uploaded;
      }
      const res = await updateProfile({ ...parsed.data, avatarPath });
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        throw new Error(res.error);
      }
      // 예전 프로필 사진 정리
      if (uploaded && initial.avatar_url && !/^https?:/.test(initial.avatar_url)) {
        await supabase.storage.from("avatars").remove([initial.avatar_url]);
      }
      router.replace(`/u/${res.handle}`);
      router.refresh();
    } catch (err) {
      if (uploaded) await supabase.storage.from("avatars").remove([uploaded]);
      setFormError(err instanceof Error ? err.message : "저장에 실패했어요.");
      setSaving(false);
    }
  }

  const handleHint = handle && !HANDLE_RE.test(handle.toLowerCase()) ? "영문 소문자·숫자·_·. 3~20자" : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6 px-4 pb-10 pt-5">
      <div className="flex flex-col items-center">
        <button type="button" onClick={() => fileRef.current?.click()} className="relative h-24 w-24 overflow-hidden rounded-full bg-neutral-200">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 포함
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-neutral-500">{(displayName || "?").slice(0, 1)}</span>
          )}
          <span className="absolute bottom-0 inset-x-0 flex justify-center bg-black/45 py-1">
            <Camera className="h-4 w-4 text-white" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setAvatarFile(f);
              setAvatarPreview(URL.createObjectURL(f));
            }
            e.target.value = "";
          }}
        />
      </div>

      <Field label="이름" error={errors.displayName}>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={20} placeholder="옷장에 표시될 이름" className={inputCls} />
      </Field>

      <Field label="아이디" error={errors.handle ?? handleHint ?? undefined} hint="옷장 주소: omu/u/아이디">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-neutral-400">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/\s/g, ""))}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="minimal.jun"
            className={`${inputCls} pl-8`}
          />
        </div>
      </Field>

      <Field label="소개" hint={`${bio.length}/150`} error={errors.bio}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={150}
          rows={3}
          placeholder="어떤 스타일을 좋아하는지 적어주세요"
          className={`${inputCls} h-auto resize-none py-3`}
        />
      </Field>

      <Field label="나의 추구미" hint={`최대 5개 · ${tags.length}개 선택`} error={errors.styleTags}>
        <div className="flex flex-wrap gap-2">
          {STYLE_TAGS.map((t) => (
            <Chip key={t} on={tags.includes(t)} onClick={() => toggleTag(t)}>#{t}</Chip>
          ))}
        </div>
      </Field>

      <div className="rounded-2xl bg-neutral-50 p-4">
        <p className="text-[15px] font-semibold">체형 정보</p>
        <p className="mb-4 text-[12px] text-neutral-500">나와 비슷한 체형의 옷장을 찾는 데 쓰여요. 선택 사항이에요.</p>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="키" error={errors.heightCm}>
              <Suffix unit="cm"><input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="170" className={`${inputCls} pr-11 text-right`} /></Suffix>
            </Field>
            <Field label="신발" error={errors.shoeSize}>
              <Suffix unit="mm"><input inputMode="numeric" value={shoe} onChange={(e) => setShoe(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="260" className={`${inputCls} pr-11 text-right`} /></Suffix>
            </Field>
          </div>
          <Field label="상의 사이즈">
            <SizeChips value={topSize} onChange={setTopSize} />
          </Field>
          <Field label="하의 사이즈">
            <SizeChips value={bottomSize} onChange={setBottomSize} />
          </Field>
        </div>
      </div>

      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{formError}</p>}

      <button type="submit" disabled={saving} className="w-full rounded-xl bg-neutral-900 py-3.5 text-[16px] font-semibold text-white disabled:opacity-60">
        {saving ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[14px] font-semibold">{label}</span>
        {hint && <span className="text-[12px] text-neutral-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3.5 py-2 text-[14px] ${on ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-700"}`}
    >
      {children}
    </button>
  );
}

function SizeChips({ value, onChange }: { value: Size | null; onChange: (v: Size | null) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEM_SIZES.map((s) => (
        <Chip key={s} on={value === s} onClick={() => onChange(value === s ? null : s)}>{s}</Chip>
      ))}
    </div>
  );
}

function Suffix({ unit, children }: { unit: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-neutral-500">{unit}</span>
    </div>
  );
}
