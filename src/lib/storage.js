// Image uploads → Supabase Storage (bucket "menu-images"), returns a public URL.
// DEMO MODE: no storage backend, so fall back to a base64 data URL that at
// least survives reloads (unlike a blob: URL, which does not).
import { sb, REMOTE, rid } from "./supabaseClient";

const BUCKET = "menu-images";

const toDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export async function uploadImage(file, folder = "items") {
  if (!file) return { ok: false, error: "No file" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Image must be under 5 MB" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Please choose an image file" };

  if (!REMOTE) {
    // demo: persistable data URL (not a throwaway blob)
    return { ok: true, url: await toDataUrl(file) };
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${rid()}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type,
  });
  if (error) return { ok: false, error: error.message };
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
