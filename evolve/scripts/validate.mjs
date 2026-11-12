// Guardrails for whatever the model writes. Anything that fails here never gets committed.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const MAX_BYTES = 200_000;

const RULES = [
  [/<script\b[^>]*\bsrc\s*=\s*(?!["']?shell\.js(?:["'\s>]))/i, "Harici <script src> yasak (yalnızca shell.js)."],
  [/<link\b(?=[^>]*\brel\s*=\s*["']?(?:stylesheet|preload|modulepreload|prefetch|import))(?![^>]*\bhref\s*=\s*["']https:\/\/fonts\.(?:googleapis|gstatic)\.com\/)[^>]*>/i,
    "Harici stil yalnızca Google Fonts olabilir."],
  [/@import\s+(?!(?:url\(\s*)?["']?https:\/\/fonts\.googleapis\.com\/)/i, "CSS @import yalnızca Google Fonts olabilir."],
  [/\b(?:src|srcset|poster|data|background)\s*=\s*["']?\s*(?:https?:)?\/\//i, "Harici görsel/medya yasak; satır içi SVG/CSS/canvas kullan."],
  [/url\(\s*["']?\s*(?:https?:)?\/\/(?!fonts\.(?:googleapis|gstatic)\.com\/)/i, "CSS url() ile harici kaynak yasak."],
  [/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i, "Meta refresh (yönlendirme) yasak."],
  [/<base\b/i, "<base> etiketi yasak."],
  [/<form\b[^>]*\baction\s*=/i, "Formlar dışarı veri gönderemez (action yasak)."],
  [/<(?:iframe|frame|object|embed)\b/i, "iframe/object/embed yasak."],
  [/document\s*\.\s*cookie/i, "Çerez erişimi yasak."],
  [/\b(?:window\s*\.\s*)?location\s*(?:\.\s*href\s*)?=(?!=)|location\s*\.\s*(?:assign|replace)\s*\(/i, "Sayfa ziyaretçiyi yönlendiremez."],
  [/\bsendBeacon\b|\bnew\s+WebSocket\b|\bEventSource\b|\bnew\s+Worker\b|\bimportScripts\b/i, "Ağ/worker API'leri yasak."],
  [/\bfetch\s*\(|XMLHttpRequest/i, "Sayfa kendi başına ağ isteği yapamaz (kabuk zaten yapıyor)."],
  [/\beval\s*\(|new\s+Function\s*\(/i, "eval / new Function yasak."],
  [/\bimport\s*\(/i, "Dinamik import yasak."],
  [/serviceWorker/i, "Service worker yasak."],
];

export function validate(html) {
  const errors = [];
  if (typeof html !== "string" || !html.trim()) return ["Boş dosya."];
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes > MAX_BYTES) errors.push(`Dosya çok büyük: ${bytes} bayt (sınır ${MAX_BYTES}).`);
  if (!/^\s*<!doctype html>/i.test(html)) errors.push("Dosya <!doctype html> ile başlamalı.");
  if (!/<\/html>\s*$/i.test(html)) errors.push("Dosya </html> ile bitmeli (kesik çıktı?).");
  if (!/<script\s+src\s*=\s*["']shell\.js["'][^>]*>\s*<\/script>/i.test(html))
    errors.push('Kabuk satırı eksik: <script src="shell.js"></script> kalmalı.');
  if (!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html)) errors.push("viewport meta etiketi eksik.");
  if (!/<title>[^<]{1,120}<\/title>/i.test(html)) errors.push("<title> eksik veya boş.");
  for (const [re, msg] of RULES) if (re.test(html)) errors.push(msg);
  const opens = (html.match(/<script\b/gi) || []).length;
  const closes = (html.match(/<\/script>/gi) || []).length;
  if (opens !== closes) errors.push("<script> etiketleri dengesiz.");
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const file = process.argv[2] || new URL("../index.html", import.meta.url);
  const errors = validate(readFileSync(file, "utf8"));
  if (errors.length) {
    console.error("✗ Geçersiz:\n - " + errors.join("\n - "));
    process.exit(1);
  }
  console.log("✓ Geçerli");
}
