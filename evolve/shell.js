/*
 * Kabuk (shell). The model cannot edit this file — it's the site's ear and memory.
 * Adds a floating button with: comment box (-> GitHub issue), pending comments + votes,
 * the current day counter, countdown to the next evolution, and a link to the timeline.
 * Runs inside a Shadow DOM so whatever CSS the model writes can't break it.
 */
(() => {
  if (window.self !== window.top) return; // inside the time machine: stay quiet
  const scriptUrl = new URL(document.currentScript?.src || "shell.js", location.href);
  const base = new URL("./", scriptUrl);
  const EVOLVE_UTC = { h: 6, m: 17 }; // keep in sync with .github/workflows/evolve.yml

  const cached = async (key, url, ttlMs) => {
    try {
      const hit = JSON.parse(sessionStorage.getItem(key) || "null");
      if (hit && Date.now() - hit.t < ttlMs) return hit.v;
    } catch {}
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(res.status);
    const v = await res.json();
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v })); } catch {}
    return v;
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const nextEvolution = () => {
    const now = new Date();
    const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), EVOLVE_UTC.h, EVOLVE_UTC.m));
    if (t <= now) t.setUTCDate(t.getUTCDate() + 1);
    return t;
  };
  const countdown = () => {
    const ms = nextEvolution() - Date.now();
    const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
    return `${h} sa ${m} dk`;
  };

  const host = document.createElement("div");
  host.id = "evolve-shell";
  host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .fab { display:flex; align-items:center; gap:8px; border:0; cursor:pointer; padding:10px 16px 10px 12px;
    border-radius:999px; background:#111; color:#fff; font-size:14px; font-weight:600;
    box-shadow:0 6px 24px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.12) inset; }
  .fab:focus-visible, button:focus-visible, a:focus-visible, textarea:focus-visible { outline:3px solid #7c5cff; outline-offset:2px; }
  .dot { width:10px; height:10px; border-radius:50%; background:#3ddc84; box-shadow:0 0 0 0 rgba(61,220,132,.7); animation:pulse 2s infinite; }
  @keyframes pulse { 70% { box-shadow:0 0 0 10px rgba(61,220,132,0); } 100% { box-shadow:0 0 0 0 rgba(61,220,132,0); } }
  @media (prefers-reduced-motion: reduce) { .dot { animation:none; } }
  .panel { position:absolute; right:0; bottom:56px; width:min(380px, calc(100vw - 32px)); max-height:min(620px, calc(100vh - 96px));
    overflow:auto; background:#fff; color:#111; border-radius:16px; padding:18px;
    box-shadow:0 18px 60px rgba(0,0,0,.3), 0 0 0 1px rgba(0,0,0,.06); font-size:14px; line-height:1.45; }
  .panel[hidden] { display:none; }
  h2 { font-size:16px; margin:0 0 4px; }
  h3 { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin:18px 0 8px; }
  p { margin:0 0 10px; color:#444; }
  textarea { width:100%; min-height:90px; resize:vertical; border:1px solid #d0d0d7; border-radius:10px; padding:10px; font-size:14px; color:#111; background:#fafafa; }
  .row { display:flex; gap:8px; align-items:center; justify-content:space-between; margin-top:8px; flex-wrap:wrap; }
  .send { border:0; border-radius:10px; padding:9px 14px; background:#7c5cff; color:#fff; font-weight:600; cursor:pointer; font-size:14px; }
  .send:disabled { opacity:.5; cursor:not-allowed; }
  .hint { font-size:12px; color:#777; }
  ul { list-style:none; margin:0; padding:0; }
  li { display:flex; gap:10px; align-items:flex-start; padding:8px 0; border-top:1px solid #eee; }
  li a { color:#111; text-decoration:none; }
  li a:hover { text-decoration:underline; }
  .votes { min-width:44px; text-align:center; font-size:12px; font-weight:700; padding:3px 6px; border-radius:8px; background:#f1effe; color:#5b3fe0; text-decoration:none !important; }
  .links { display:flex; gap:14px; margin-top:16px; padding-top:12px; border-top:1px solid #eee; flex-wrap:wrap; }
  .links a { color:#5b3fe0; font-weight:600; text-decoration:none; }
  .meta { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 4px; }
  .chip { font-size:12px; background:#f3f3f5; border-radius:999px; padding:3px 10px; color:#333; }
  @media (prefers-color-scheme: dark) {
    .panel { background:#16161a; color:#eee; box-shadow:0 18px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08); }
    p { color:#bbb; } h3 { color:#999; } .hint { color:#999; }
    textarea { background:#0f0f12; color:#eee; border-color:#333; }
    li { border-color:#2a2a30; } li a { color:#eee; } .links { border-color:#2a2a30; }
    .votes { background:#2a2350; color:#c9bcff; } .links a { color:#b6a5ff; }
    .chip { background:#24242a; color:#ddd; }
  }
</style>
<div class="panel" id="panel" role="dialog" aria-label="Siteyi değiştir" hidden>
  <h2>Bu site kendini yeniden yazıyor 🧬</h2>
  <p>Her gün bir yapay zekâ buradaki yorumları okuyup sitenin kodunu değiştiriyor. Ne değişsin?</p>
  <div class="meta"><span class="chip" id="day">Gün …</span><span class="chip">Sonraki evrim: <b id="cd">…</b></span></div>
  <label for="msg" class="hint">Fikrin (GitHub'da herkese açık bir yorum olarak açılır)</label>
  <textarea id="msg" maxlength="1500" placeholder="Örn: Arka plan gece gökyüzü olsun, yıldızlar fareyi takip etsin."></textarea>
  <div class="row"><span class="hint">GitHub hesabı gerekir · 👍 = oy</span><button class="send" id="send" disabled>Gönder →</button></div>
  <h3>Sırada bekleyen fikirler</h3>
  <ul id="list"><li><span class="hint">Yükleniyor…</span></li></ul>
  <div class="links"><a id="evo" href="#">Evrim zaman çizelgesi →</a><a id="law" href="#" target="_blank" rel="noopener">Anayasa</a></div>
</div>
<button class="fab" id="fab" aria-expanded="false" aria-controls="panel"><span class="dot" aria-hidden="true"></span><span id="fabtxt">Siteyi değiştir</span></button>`;

  const $ = (id) => root.getElementById(id);
  const mount = () => document.body.appendChild(host);
  document.body ? mount() : document.addEventListener("DOMContentLoaded", mount);

  $("evo").href = new URL("evolution.html", base).href;
  $("fab").addEventListener("click", () => {
    const open = $("panel").hidden;
    $("panel").hidden = !open;
    $("fab").setAttribute("aria-expanded", String(open));
    if (open) { $("msg").focus(); loadIssues(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("panel").hidden) { $("panel").hidden = true; $("fab").setAttribute("aria-expanded", "false"); $("fab").focus(); }
  });
  $("msg").addEventListener("input", () => { $("send").disabled = $("msg").value.trim().length < 5; });
  $("cd").textContent = countdown();
  setInterval(() => { $("cd").textContent = countdown(); }, 30_000);

  let cfg;
  const config = (async () => {
    cfg = await (await fetch(new URL("config.json", base))).json();
    $("law").href = `https://github.com/${cfg.owner}/${cfg.repo}/blob/${cfg.branch}/${cfg.dir}/CONSTITUTION.md`;
    return cfg;
  })();

  fetch(new URL("evolution.json", base), { cache: "no-cache" })
    .then((r) => r.json())
    .then((log) => {
      const last = log[log.length - 1];
      $("day").textContent = `Gün ${last.day} · ${last.title}`;
      $("fabtxt").textContent = `Gün ${last.day} · Siteyi değiştir`;
    })
    .catch(() => {});

  $("send").addEventListener("click", async () => {
    const c = await config;
    const text = $("msg").value.trim();
    const title = text.split("\n")[0].slice(0, 70) + (text.length > 70 ? "…" : "");
    const url = new URL(`https://github.com/${c.owner}/${c.repo}/issues/new`);
    url.searchParams.set("template", "feedback.yml");
    url.searchParams.set("title", title);
    url.searchParams.set("yorum", text);
    url.searchParams.set("sayfa", location.href);
    window.open(url.href, "_blank", "noopener");
  });

  let loaded = false;
  async function loadIssues() {
    if (loaded) return;
    loaded = true;
    const c = await config;
    const list = $("list");
    try {
      const issues = await cached(
        "evolve-issues",
        `https://api.github.com/repos/${c.owner}/${c.repo}/issues?labels=${encodeURIComponent(c.label)}&state=open&per_page=30`,
        5 * 60_000,
      );
      const items = issues
        .filter((i) => !i.pull_request && !i.labels.some((l) => l.name === "evolve-ignore"))
        .map((i) => ({ ...i, score: (i.reactions?.["+1"] || 0) - (i.reactions?.["-1"] || 0) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      list.innerHTML = items.length
        ? items.map((i) => `<li><a class="votes" href="${esc(i.html_url)}" target="_blank" rel="noopener" title="GitHub'da 👍 bırakarak oy ver">👍 ${i.score}</a><a href="${esc(i.html_url)}" target="_blank" rel="noopener">${esc(i.title)}</a></li>`).join("")
        : `<li><span class="hint">Henüz bekleyen fikir yok. İlk sen yaz — yarın site değişsin.</span></li>`;
    } catch {
      list.innerHTML = `<li><span class="hint">Fikirler şu an yüklenemedi. <a href="https://github.com/${esc(c.owner)}/${esc(c.repo)}/issues?q=is%3Aopen+label%3A${esc(c.label)}" target="_blank" rel="noopener">GitHub'da gör →</a></span></li>`;
    }
  }
})();
