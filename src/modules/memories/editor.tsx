"use client";
/* eslint-disable @next/next/no-img-element -- Blob previews remain local until upload. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { videoPoster } from "@/lib/video-poster";
import { api, bytes, upload } from "@/lib/client";
import type { Memory, MemoryInput, MediaAsset } from "./types";
type Selected = {
  key: string;
  preview: string;
  file?: File;
  asset?: MediaAsset;
  progress: number;
  error?: string;
};
const localTime = (value: string) =>
  new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 16);
const accepted = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
export function MemoryEditor({ memory }: { memory?: Memory }) {
  const router = useRouter();
  const { user, notify } = useApp();
  const initial: MemoryInput = {
    title: memory?.title || "",
    content: memory?.content || "",
    happenedAt: memory?.happenedAt || new Date().toISOString(),
    location: memory?.location || "",
    mood: memory?.mood || "",
    tags: memory?.tags || [],
    visibility: memory?.visibility || "private",
    assetIds: memory?.assets.map((a) => a.id) || [],
  };
  const [fields, setFields] = useState(initial);
  const [items, setItems] = useState<Selected[]>(
    memory?.assets.map((a) => ({
      key: a.id,
      preview: a.url,
      asset: a,
      progress: 100,
    })) || [],
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<MemoryInput | null>(null);
  const [draftState, setDraftState] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const blobs = useRef(new Set<string>());
  const savedRef = useRef(false);
  const key = `nsb:draft:${user!.id}:${memory?.id || "new"}`;
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) setDraft(JSON.parse(stored));
      } catch {
        setDraftState("无法读取浏览器草稿");
      }
    });
    const urls = blobs.current;
    return () => {
      abort.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [key]);
  useEffect(() => {
    if (!dirty || busy || savedRef.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(fields));
        setDraftState("草稿已保存");
      } catch {
        setDraftState("浏览器空间不足，草稿暂未保存");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [fields, dirty, busy, key]);
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function update<K extends keyof MemoryInput>(name: K, value: MemoryInput[K]) {
    setFields((v) => ({ ...v, [name]: value }));
    setDirty(true);
  }
  function addFiles(list: FileList | File[]) {
    if (busy) return;
    const additions: Selected[] = [];
    const errors: string[] = [];
    for (const original of Array.from(list)) {
      const fallback: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        avif: "image/avif",
        mp4: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",
      };
      const file = original.type
        ? original
        : new File([original], original.name, {
            type: fallback[original.name.split(".").pop()!.toLowerCase()] || "",
            lastModified: original.lastModified,
          });
      if (!accepted.includes(file.type)) {
        errors.push(`${file.name}：暂不支持该格式`);
        continue;
      }
      if (
        file.size < 1 ||
        file.size > (file.type.startsWith("video/") ? 200 : 20) * 1024 ** 2
      ) {
        errors.push(
          `${file.name}：${file.type.startsWith("video/") ? "视频不超过 200 MB" : "照片不超过 20 MB"}`,
        );
        continue;
      }
      if (items.length + additions.length >= 12) {
        errors.push("每段记忆最多 12 个附件");
        break;
      }
      if (
        [...items, ...additions].some(
          (i) =>
            i.file?.name === file.name &&
            i.file.size === file.size &&
            i.file.lastModified === file.lastModified,
        )
      )
        continue;
      const preview = URL.createObjectURL(file);
      blobs.current.add(preview);
      additions.push({ key: (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `file-${Date.now()}-${Math.random().toString(36).slice(2)}`), preview, file, progress: 0 });
    }
    setItems((v) => [...v, ...additions]);
    setError(errors.join("；"));
    if (additions.length) setDirty(true);
  }
  function remove(item: Selected) {
    if (item.preview.startsWith("blob:")) {
      URL.revokeObjectURL(item.preview);
      blobs.current.delete(item.preview);
    }
    setItems((v) => v.filter((x) => x.key !== item.key));
    setDirty(true);
  }
  function reorder(index: number, direction: number) {
    setItems((v) => {
      const next = [...v];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
    setDirty(true);
  }
  async function transfer(item:Selected,signal:AbortSignal) {
    setItems(v=>v.map(x=>x.key===item.key?{...x,error:undefined,progress:0}:x));
    const asset=await upload(item.file!,progress=>setItems(v=>v.map(x=>x.key===item.key?{...x,progress}:x)),signal);
    // Keep a completed original even if poster generation fails or upload is cancelled.
    setItems(v=>v.map(x=>x.key===item.key?{...x,asset,progress:100}:x));
    if(item.file?.type.startsWith("video/")) {
      const poster=await videoPoster(item.file,signal);
      if(poster&&!signal.aborted)try{
        const response=await fetch(asset.url+"/preview",{method:"POST",body:poster,headers:{"Content-Type":poster.type},signal});
        if(response.ok){const ready=await response.json() as MediaAsset;setItems(v=>v.map(x=>x.key===item.key?{...x,asset:ready}:x));}
      }catch{/* Original media remains available. */}
    }
    return asset;
  }
  async function retryUpload(item:Selected) {
    const controller=new AbortController();abort.current=controller;setBusy(true);setError("");setStage("重新上传中…");
    try{await transfer(item,controller.signal);}catch(e){const message=(e as Error).name==="AbortError"?"已取消上传":(e as Error).message;setItems(v=>v.map(x=>x.key===item.key?{...x,error:message}:x));setError(message);}finally{setBusy(false);setStage("");abort.current=null;}
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!fields.title.trim() && !fields.content.trim() && !items.length) {
      setError("写点文字，或者放一张照片吧。");
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    try {
      const assetIds: string[] = [];
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        if (item.asset) {
          assetIds.push(item.asset.id);
          continue;
        }
        if (!item.file) continue;
        setStage(`正在上传 ${index + 1} / ${items.length}`);
        setItems((v) =>
          v.map((x) =>
            x.key === item.key ? { ...x, error: undefined, progress: 0 } : x,
          ),
        );
        try {
          const asset = await transfer(item,controller.signal);
          assetIds.push(asset.id);
        } catch (err) {
          setItems((v) =>
            v.map((x) =>
              x.key === item.key ? { ...x, error: (err as Error).message } : x,
            ),
          );
          throw err;
        }
      }
      if (controller.signal.aborted) return;
      setStage("保存中…");
      const saved = await api<Memory>(
        memory ? `/api/memories/${memory.id}` : "/api/memories",
        {
          method: memory ? "PATCH" : "POST",
          body: JSON.stringify({
            ...fields,
            tags: fields.tags.map((t) => t.trim()).filter(Boolean),
            assetIds,
            ...(memory ? { updatedAt: memory.updatedAt } : {}),
          }),
        },
      );
      savedRef.current = true;
      try {
        localStorage.removeItem(key);
      } catch {
        /* Saved record is authoritative. */
      }
      setDirty(false);
      notify(memory ? "记忆已更新" : "记录已保存");
      router.replace(`/memories/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(
        (err as Error).name === "AbortError"
          ? "已取消。文字和已传好的附件仍在，可以继续保存。"
          : (err as Error).message,
      );
    } finally {
      setBusy(false);
      setStage("");
      abort.current = null;
    }
  }
  return (
    <>
      <Link
        className="text-link back-link"
        href={memory ? `/memories/${memory.id}` : "/memories"}
      >
        <Icon name="back" size={16} />
        回到{memory ? "记忆" : "时间线"}
      </Link>
      <section className="page-heading editor-heading">
        <div>

          <h1>
            {memory ? "编辑记录" : "新建记录"}

          </h1>

        </div>
      </section>
      {draft && (
        <div className="notice draft-notice">
          <span>找到一份本地文字草稿。附件需要重新选择。</span>
          <button
            type="button"
            disabled={busy}
            className="text-link"
            onClick={() => {
              setFields((v) => ({ ...v, ...draft, assetIds: v.assetIds }));
              setDraft(null);
              setDirty(true);
            }}
          >
            恢复草稿
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="忽略草稿"
            onClick={() => {
              localStorage.removeItem(key);
              setDraft(null);
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <form onSubmit={save} className="editor-form">
        <div className="editor-main">
          <section className="editor-paper">
            <input
              className="title-input"
              aria-label="记忆标题"
              maxLength={100}
              placeholder="标题（选填）"
              value={fields.title}
              disabled={busy}
              onChange={(e) => update("title", e.target.value)}
            />
            <textarea
              className="body-input"
              aria-label="记忆正文"
              maxLength={20000}
              rows={10}
              placeholder="写点今天的事……"
              value={fields.content}
              disabled={busy}
              onChange={(e) => update("content", e.target.value)}
            />
            <div className="editor-wordcount">
              {fields.content.length.toLocaleString()} / 20,000 字
            </div>
          </section>
          <section className="attachment-section">
            <div className="section-heading">
              <h2>
                照片与影像 <span>{items.length} / 12</span>
              </h2>

            </div>
            <input
              ref={input}
              type="file"
              multiple
              accept={accepted.join(",")}
              className="sr-only"
              tabIndex={-1}
              disabled={busy}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className={`drop-zone ${dragging ? "dragging" : ""}`}
              disabled={busy}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <span className="upload-circle">
                <Icon name="plus" size={26} />
              </span>
              <strong>拖到这里，或点一下选择文件</strong>
              <span>照片最大 20 MB，视频最大 200 MB · 最多 12 个附件</span>
              <small>
                支持 JPG / PNG / GIF / WebP / AVIF / MP4 / WebM / MOV
              </small>
            </button>
            {items.length > 0 && (
              <div className="upload-previews">
                {items.map((item, index) => (
                  <div
                    className={`upload-item ${item.error ? "failed" : ""}`}
                    key={item.key}
                  >
                    <div className="upload-preview">
                      {(item.file?.type || item.asset?.mime || "").startsWith(
                        "video/",
                      ) ? (
                        <video
                          src={`${item.preview}#t=0.1`}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={item.preview}
                          alt={item.file?.name || item.asset?.filename}
                        />
                      )}
                      <span className="upload-order">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.asset && (
                        <span className="upload-done">
                          <Icon name="check" size={13} />
                        </span>
                      )}
                      <button
                        className="remove-upload"
                        type="button"
                        aria-label={`移除附件 ${index + 1}`}
                        disabled={busy}
                        onClick={() => remove(item)}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                    <span className="upload-filename">
                      {item.file?.name || item.asset?.filename}
                    </span>
                    <div className="upload-info">
                      <span>
                        {bytes(item.file?.size || item.asset?.sizeBytes || 0)}
                      </span>
                      <div>
                        <button
                          type="button"
                          aria-label={`前移附件 ${index + 1}`}
                          disabled={busy || !index}
                          onClick={() => reorder(index, -1)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          aria-label={`后移附件 ${index + 1}`}
                          disabled={busy || index === items.length - 1}
                          onClick={() => reorder(index, 1)}
                        >
                          →
                        </button>
                      </div>
                    </div>
                    {busy && !item.asset && (
                      <progress
                        value={item.progress}
                        max={100}
                        aria-label={`${item.file?.name} 上传进度`}
                      />
                    )}
                    <span className="tiny upload-status">
                      {item.error ||
                        (busy && !item.asset
                          ? `${item.progress}%`
                          : item.asset
                            ? "已就绪"
                            : "等待上传")}
                    </span>
                    {item.error && !item.asset && <button type="button" className="upload-retry" disabled={busy} onClick={()=>retryUpload(item)}>重新上传</button>}
                  </div>
                ))}
              </div>
            )}
            {busy && items.length > 0 && <div className="upload-summary" role="status"><span>{stage}</span><progress aria-label="总上传进度" max={100} value={Math.round(items.reduce((sum,item)=>sum+(item.asset?100:item.progress),0)/items.length)} /></div>}
          </section>
        </div>
        <aside className="editor-options">
          <section className="options-card">
            <h2>记录信息</h2>
            <label>
              <span>
                <Icon name="calendar" size={15} />
                发生时间 · 北京时间
              </span>
              <input
                type="datetime-local"
                required
                min="1900-01-01T00:00"
                max="2100-12-31T23:59"
                disabled={busy}
                value={localTime(fields.happenedAt)}
                onChange={(e) => {
                  if (e.target.value)
                    update(
                      "happenedAt",
                      new Date(`${e.target.value}:00+08:00`).toISOString(),
                    );
                }}
              />
            </label>
            <label>
              <span>
                <Icon name="map" size={15} />
                地点
              </span>
              <input
                maxLength={80}
                placeholder="比如，回家的路上"
                disabled={busy}
                value={fields.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </label>
            <label>
              <span>此刻心情</span>
              <select
                value={fields.mood}
                disabled={busy}
                onChange={(e) => update("mood", e.target.value)}
              >
                <option value="">不特别标记</option>
                {["开心", "平静", "感动", "疲惫", "想念"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              <span>标签</span>
              <input
                placeholder="生活, 散步, 小确幸"
                maxLength={168}
                disabled={busy}
                value={fields.tags.join(",")}
                onChange={(e) =>
                  update(
                    "tags",
                    e.target.value.replace(/，/g, ",").split(",").slice(0, 8),
                  )
                }
              />
              <small>用逗号分隔，最多 8 个，每个 20 字</small>
            </label>
          </section>
          <section className="options-card privacy-options">
            <h2>让谁看见</h2>
            <label
              className={
                fields.visibility === "private"
                  ? "radio-card selected"
                  : "radio-card"
              }
            >
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={fields.visibility === "private"}
                disabled={busy}
                onChange={() => update("visibility", "private")}
              />
              <Icon name="lock" size={18} />
              <span>
                仅自己<small>只有你可以查看</small>
              </span>
            </label>
            <label
              className={
                fields.visibility === "public"
                  ? "radio-card selected"
                  : "radio-card"
              }
            >
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={fields.visibility === "public"}
                disabled={busy}
                onChange={() => update("visibility", "public")}
              />
              <Icon name="globe" size={18} />
              <span>
                公开分享<small>任何访客都可以查看原图和视频</small>
              </span>
            </label>
          </section>
          <div className="editor-save">
            <button className="button wide" type="submit" disabled={busy}>
              {busy ? stage : memory ? "保存修改" : "保存记录"}
              {!busy && <Icon name="arrow" size={17} />}
            </button>
            {busy && stage !== "保存中…" && (
              <button
                type="button"
                className="text-link"
                onClick={() => abort.current?.abort()}
              >
                取消上传
              </button>
            )}
            <span className="tiny muted">
              {draftState || "文字草稿会自动保存在此浏览器"}
            </span>

          </div>
        </aside>
        {error && (
          <div className="notice error editor-error" role="alert">
            {error}
          </div>
        )}
      </form>
    </>
  );
}
