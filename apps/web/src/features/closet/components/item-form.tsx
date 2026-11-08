"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import {
  CATEGORY_LABELS, HANDOFF_LABELS, HANDOFF_METHODS, ITEM_CATEGORIES, ITEM_SIZES, MAX_ITEM_IMAGES, STYLE_TAGS,
  itemInputSchema,
} from "@omu/core";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";
import { compressImage } from "@/lib/image";
import { createItem } from "../actions";

type Photo = { id: string; file: File; preview: string };
type Category = (typeof ITEM_CATEGORIES)[number];
type Size = (typeof ITEM_SIZES)[number];
type Tag = (typeof STYLE_TAGS)[number];
type Handoff = (typeof HANDOFF_METHODS)[number];

const MAX_TAGS = 5;
const toInt = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/[^\d]/g, "")));

export function ItemForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [brand, setBrand] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [minDays, setMinDays] = useState("1");
  const [maxDays, setMaxDays] = useState("7");
  const [handoff, setHandoff] = useState<Handoff[]>(["in_person"]);
  const [forSale, setForSale] = useState(false);
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null); // 진행 단계 문구

  // 미리보기 URL 정리
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), [photos]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const room = MAX_ITEM_IMAGES - photos.length;
    const next = [...list]
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room)
      .map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...next]);
    setErrors((e) => ({ ...e, photos: "" }));
  }

  function removePhoto(id: string) {
    setPhotos((p) => p.filter((x) => x.id !== id));
  }

  function makeCover(id: string) {
    setPhotos((p) => [...p.filter((x) => x.id === id), ...p.filter((x) => x.id !== id)]);
  }

  function toggleTag(t: Tag) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= MAX_TAGS ? cur : [...cur, t]));
  }

  function toggleHandoff(h: Handoff) {
    setHandoff((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const input = {
      title: title.trim(),
      description: description.trim(),
      category,
      size,
      brand: brand.trim() || undefined,
      styleTags: tags,
      pricePerDay: toInt(price),
      deposit: toInt(deposit),
      minDays: toInt(minDays),
      maxDays: toInt(maxDays),
      forSale,
      handoffMethods: handoff,
    };

    // 1) 업로드 전에 먼저 검증 (사진 올리고 실패하면 낭비이므로)
    const parsed = itemInputSchema.safeParse(input);
    const fieldErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= friendly(String(issue.path[0]), issue.message);
    }
    if (photos.length === 0) fieldErrors.photos = "사진을 1장 이상 올려주세요.";
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      document.querySelector(`[data-field="${Object.keys(fieldErrors)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!hasSupabase()) {
      setFormError("Supabase 환경변수가 설정되지 않았습니다 (.env.local).");
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?next=/closet/new");
      return;
    }

    // 2) 사진 압축 → Storage 업로드 (items/{uid}/{uuid}.jpg)
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < photos.length; i++) {
        setSubmitting(`사진 올리는 중 (${i + 1}/${photos.length})`);
        const blob = await compressImage(photos[i].file);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("items").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        uploaded.push(path);
      }

      // 3) DB 저장
      setSubmitting("등록하는 중");
      const res = await createItem(parsed.data, uploaded);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        throw new Error(res.error);
      }
      router.replace(`/items/${res.id}`);
    } catch (err) {
      if (uploaded.length) await supabase.storage.from("items").remove(uploaded); // 고아 파일 정리
      setFormError(err instanceof Error ? err.message : "등록에 실패했어요.");
      setSubmitting(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7 px-4 pb-8 pt-4">
      {/* 사진 */}
      <Field label="사진" hint={`${photos.length}/${MAX_ITEM_IMAGES} · 첫 장이 대표 사진이에요`} error={errors.photos} name="photos">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {photos.length < MAX_ITEM_IMAGES && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex aspect-[3/4] w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500"
            >
              <Camera className="h-6 w-6" strokeWidth={1.5} />
              <span className="text-[12px]">사진 추가</span>
            </button>
          )}
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기 */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" onClick={() => makeCover(p.id)} />
              {i === 0 ? (
                <span className="absolute bottom-0 inset-x-0 bg-black/60 py-1 text-center text-[11px] text-white">대표</span>
              ) : (
                <span className="absolute bottom-0 inset-x-0 bg-black/30 py-1 text-center text-[11px] text-white">탭하면 대표로</span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                aria-label="사진 삭제"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </Field>

      <Field label="이름" error={errors.title} name="title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="예) 울 블렌드 싱글 코트" className={inputCls} />
      </Field>

      <Field label="카테고리" error={errors.category} name="category">
        <Chips options={ITEM_CATEGORIES} selected={category ? [category] : []} onToggle={(c) => setCategory(c)} label={(c) => CATEGORY_LABELS[c]} />
      </Field>

      <Field label="사이즈" error={errors.size} name="size">
        <Chips options={ITEM_SIZES} selected={size ? [size] : []} onToggle={(s) => setSize(s)} />
      </Field>

      <Field label="브랜드" hint="선택" name="brand">
        <input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={40} placeholder="예) COS" className={inputCls} />
      </Field>

      <Field label="추구미 태그" hint={`최대 ${MAX_TAGS}개 · ${tags.length}개 선택`} error={errors.styleTags} name="styleTags">
        <Chips options={STYLE_TAGS} selected={tags} onToggle={toggleTag} label={(t) => `#${t}`} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="하루 대여료" error={errors.pricePerDay} name="pricePerDay">
          <WonInput value={price} onChange={setPrice} placeholder="3,000" />
        </Field>
        <Field label="보증금" error={errors.deposit} name="deposit">
          <WonInput value={deposit} onChange={setDeposit} placeholder="30,000" />
        </Field>
      </div>
      <p className="-mt-5 text-[12px] text-neutral-500">보증금은 파손·미반납에 대비해 받아요. 보통 옷 가격 정도로 정해요.</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="최소 대여일" error={errors.minDays} name="minDays">
          <DaysInput value={minDays} onChange={setMinDays} />
        </Field>
        <Field label="최대 대여일" error={errors.maxDays} name="maxDays">
          <DaysInput value={maxDays} onChange={setMaxDays} />
        </Field>
      </div>

      <Field label="전달 방법" error={errors.handoffMethods} name="handoffMethods">
        <Chips options={HANDOFF_METHODS} selected={handoff} onToggle={toggleHandoff} label={(h) => HANDOFF_LABELS[h]} />
      </Field>

      <Field label="설명" hint="선택" name="description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={5}
          placeholder={"실측 사이즈, 착용감, 상태(오염·수선 여부) 등을 적어주세요.\n예) 어깨 46 / 총장 98, 170cm 기준 무릎 아래"}
          className={`${inputCls} h-auto resize-none py-3 leading-relaxed`}
        />
      </Field>

      <label className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
        <span>
          <span className="block text-[15px] font-medium">판매도 가능해요</span>
          <span className="text-[12px] text-neutral-500">원하는 사람이 있으면 구매 제안을 받을 수 있어요</span>
        </span>
        <input type="checkbox" checked={forSale} onChange={(e) => setForSale(e.target.checked)} className="h-5 w-5 accent-neutral-900" />
      </label>

      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={submitting !== null}
        className="h-13 w-full rounded-xl bg-neutral-900 py-3.5 text-[16px] font-semibold text-white disabled:opacity-60"
      >
        {submitting ?? "옷장에 등록하기"}
      </button>
    </form>
  );
}

const inputCls =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[15px] outline-none placeholder:text-neutral-400 focus:border-neutral-900";

function friendly(field: string, msg: string): string {
  const map: Record<string, string> = {
    title: "이름을 2자 이상 입력해 주세요.",
    category: "카테고리를 골라주세요.",
    size: "사이즈를 골라주세요.",
    pricePerDay: "대여료를 숫자로 입력해 주세요.",
    deposit: "보증금을 숫자로 입력해 주세요.",
    handoffMethods: "전달 방법을 하나 이상 골라주세요.",
    maxDays: "대여일은 1~60일 사이로 입력해 주세요.",
  };
  if (field === "minDays") return msg.includes("최소") ? msg : "대여일은 1~30일 사이로 입력해 주세요.";
  return map[field] ?? msg;
}

function Field({ label, hint, error, name, children }: { label: string; hint?: string; error?: string; name: string; children: React.ReactNode }) {
  return (
    <div data-field={name}>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[15px] font-semibold">{label}</span>
        {hint && <span className="text-[12px] text-neutral-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

function Chips<T extends string>({ options, selected, onToggle, label }: { options: readonly T[]; selected: T[]; onToggle: (v: T) => void; label?: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={on}
            className={`rounded-full px-3.5 py-2 text-[14px] ${on ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-700"}`}
          >
            {label ? label(o) : o}
          </button>
        );
      })}
    </div>
  );
}

function WonInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const n = toInt(value);
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        value={Number.isNaN(n) ? "" : n.toLocaleString("ko-KR")}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={placeholder}
        className={`${inputCls} pr-9 text-right`}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-neutral-500">원</span>
    </div>
  );
}

function DaysInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} className={`${inputCls} pr-9 text-right`} />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-neutral-500">일</span>
    </div>
  );
}
