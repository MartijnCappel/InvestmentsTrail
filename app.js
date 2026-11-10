/* The Investment Trail — standalone scavenger hunt (GitHub Pages + Supabase) */
(() => {
"use strict";

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const app = $("#app");
const norm = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const KINDS = {
  question:   {label:"Question",   c:"#1E67C9", def:10},
  assignment: {label:"Assignment", c:"#D9780A", def:20},
  activity:   {label:"Activity",   c:"#B8347A", def:30},
};
const GOLD = "#F5C400", BRAND = "#00716B";
const RESP = {text:"Text answer", photo:"Photo", both:"Text + photo"};
const T = t => t ? new Date(t).getTime() : 0;
const fmtTime = t => t ? new Date(t).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : "";
const ago = t => { if (!t) return ""; const m = Math.round((Date.now() - T(t)) / 60000); if (m < 1) return "just now"; if (m < 60) return m + " min ago"; return fmtTime(t); };
const gmaps = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}&travelmode=walking`;
const fmtDist = m => m == null ? "–" : m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(m < 10000 ? 1 : 0) + " km";
function distM(lat1, lng1, lat2, lng2) { const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lng2 - lng1) * r / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(a)); }
function bearing(lat1, lng1, lat2, lng2) { const r = Math.PI / 180, y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r), x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r); return (Math.atan2(y, x) / r + 360) % 360; }
const compassWord = b => ["N","NE","E","SE","S","SW","W","NW"][Math.round(b / 45) % 8];
const I = {
  chat:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  team:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
  out:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
  nav:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l7 19-7-4-7 4z"/></svg>',
  cam:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  fit:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  me:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  star:'<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/></svg>',
  info:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".6" fill="currentColor"/></svg>',
  lock:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};
const pinSVG = (color, inner, ink = "#fff") => `<svg width="32" height="42" viewBox="-16 -40 32 42"><path d="M0,0C-3,-7 -14,-12 -14,-25A14,14 0 1 1 14,-25C14,-12 3,-7 0,0Z" fill="${color}" stroke="#fff" stroke-width="2.2"/>${inner(ink)}</svg>`;
const pinNum = n => ink => `<text y="-20" text-anchor="middle" font-family="Red Hat Display,system-ui,sans-serif" font-weight="800" font-size="13" fill="${ink}">${esc(n)}</text>`;
const pinCheck = ink => `<path d="M-6,-25L-1.5,-20.5L6.5,-29" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const pinLock = ink => `<g fill="none" stroke="${ink}" stroke-width="2"><rect x="-5.5" y="-26" width="11" height="8.5" rx="1.5"/><path d="M-3,-26v-2.5a3,3 0 0 1 6,0v2.5"/></g>`;
const pinStar = ink => `<path d="M0,-34l2.9,6.2 6.8.7-5.1,4.5 1.5,6.6L0,-19.4l-6.1,3.6 1.5-6.6-5.1-4.5 6.8-.7z" fill="${ink}"/>`;
const pinFlag = ink => `<path d="M-5,-33V-17M-5,-33H6L3,-29L6,-25H-5" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linejoin="round"/>`;
const pinIcon = (svg, cls = "") => L.divIcon({className:"pinicon " + cls, html:svg, iconSize:[32,42], iconAnchor:[16,42], popupAnchor:[0,-40]});

/* ---------- config / supabase ---------- */
const CFG = window.TRAIL_CONFIG || {};
if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
  app.innerHTML = `<div class="setup"><h1>Almost there</h1><p>This hunt isn't connected to a database yet. Open <code>config.js</code> in the repository and fill in your Supabase Project URL and anon key (Supabase → Project Settings → API). Then run <code>supabase/setup.sql</code> once in the Supabase SQL Editor.</p></div>`;
  return;
}
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {auth:{persistSession:false}});

/* ---------- session ---------- */
let session = null;
try { session = JSON.parse(localStorage.getItem("trail-session")); } catch (e) {}
function saveSession(s) { session = s; try { s ? localStorage.setItem("trail-session", JSON.stringify(s)) : localStorage.removeItem("trail-session"); } catch (e) {} }

/* ---------- state ---------- */
let S = null;               // last get_state result
const ui = {screen:null, tab:"points", chatTeam:null, mode:"pan", modal:null, showAll:false, areaFirst:null, follow:true};
const geo = {lat:null, lng:null, acc:null, at:0, err:null, watch:null, lastPing:0, near:new Set()};

const cfg = () => (S && S.config) || {};
const status = () => cfg().status || "setup";
const teamById = id => S.teams.find(t => t.id === id);
const subFor = (tid, target) => S.subs.find(s => s.team_id === tid && s.target_id === target);
const isUnlocked = (tid, pid) => S.role === "team" ? !!(S.points.find(p => p.id === pid) || {}).unlocked : S.unlocks.some(u => u.team_id === tid && u.point_id === pid);
const doneCount = tid => S.points.filter(p => { const s = subFor(tid, p.id); return s && s.status !== "rejected"; }).length;
function ranking() {
  return S.teams.map(t => {
    const oks = S.subs.filter(s => s.team_id === t.id && s.status === "ok");
    return {t, score:t.score || 0, done:S.role === "admin" ? doneCount(t.id) : 0, last:Math.max(0, ...oks.map(s => T(s.at)))};
  }).sort((a, b) => b.score - a.score || b.done - a.done || (a.last || 9e15) - (b.last || 9e15));
}
const unreadFor = (tid, side) => {
  const r = S.reads.find(r => r.team_id === tid && r.side === side); const last = r ? T(r.at) : 0;
  const from = side === "admin" ? "team" : "admin";
  return S.msgs.filter(m => m.team_id === tid && m.sender === from && T(m.at) > last).length;
};

/* ---------- server calls ---------- */
const ERR = {
  not_logged_in:"Your code no longer works. Ask the organiser for your current code.",
  not_admin:"Your organiser code no longer works. Log in again.",
  code_too_short:"Use at least 4 letters or digits.",
  code_in_use:"That code is already used by a team.",
};
async function rpc(fn, args) {
  const {data, error} = await sb.rpc(fn, args);
  if (error) {
    const key = Object.keys(ERR).find(k => (error.message || "").includes(k));
    const e = new Error(key ? ERR[key] : "Couldn't reach the server. Check your connection and try again.");
    e.key = key; throw e;
  }
  return data;
}
async function act(payload, action, okMsg) {
  try {
    const fn = session.role === "admin" ? "admin_action" : "team_action";
    const r = await rpc(fn, {p_code:session.code, p_action:action, p:payload || {}});
    if (okMsg && (!r || r.ok !== false)) toast(typeof okMsg === "function" ? okMsg(r) : okMsg);
    refresh();
    return r || {ok:true};
  } catch (e) {
    toast(e.message);
    if (e.key === "not_logged_in" || e.key === "not_admin") { saveSession(null); render(true); }
    return {ok:false, error:e.message};
  }
}

let refreshing = false, again = false, lastJSON = "";
async function refresh() {
  if (!session) return;
  if (refreshing) { again = true; return; }
  refreshing = true;
  try {
    const st = await rpc("get_state", {p_code:session.code});
    if (!st) { saveSession(null); S = null; render(true); toast("That code no longer works."); return; }
    const j = JSON.stringify(st);
    if (j !== lastJSON) { lastJSON = j; S = st; render(); }
    netOk(true);
  } catch (e) { netOk(false); }
  finally { refreshing = false; if (again) { again = false; refresh(); } }
}
let netBad = false;
function netOk(ok) { if (ok === !netBad) return; netBad = !ok; if (!ok) toast("Connection lost — retrying…"); }

/* realtime: listen to the tick counter, re-fetch when it changes */
let rtTimer = null, rtLive = false;
sb.channel("ticks").on("postgres_changes", {event:"*", schema:"public", table:"ticks"}, () => { clearTimeout(rtTimer); rtTimer = setTimeout(refresh, 250); })
  .subscribe(s => { rtLive = s === "SUBSCRIBED"; });
setInterval(() => { if (session && document.visibilityState === "visible") refresh(); }, 1000 * 12);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });

/* ---------- toast / confirm / sheet ---------- */
let toastT;
function toast(msg) { let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role","status"); document.body.appendChild(t); } t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3400); }
function armed(btn, label) {
  if (btn.classList.contains("armed")) return true;
  const old = btn.innerHTML; btn.classList.add("armed"); btn.textContent = label || "Tap again to confirm";
  setTimeout(() => { if (btn.isConnected) { btn.classList.remove("armed"); btn.innerHTML = old; } }, 3500);
  return false;
}
function patch(el, html) {
  if (!el) return;
  if (el.contains(document.activeElement) && document.activeElement.matches("input,textarea,select")) {
    el._pending = html;
    if (!el._bound) { el._bound = true; el.addEventListener("focusout", () => setTimeout(() => { if (el._pending != null && !el.contains(document.activeElement)) { el.innerHTML = el._pending; el._last = el._pending; el._pending = null; } }, 0)); }
    return;
  }
  if (el._last === html) return;
  el._last = html; el.innerHTML = html;
}
function openSheet(html, mount, opts = {}) {
  closeSheet();
  const scrim = document.createElement("div"); scrim.className = "scrim";
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  scrim.addEventListener("pointerdown", e => { scrim._down = e.target === scrim; });
  scrim.addEventListener("click", e => { if (e.target === scrim && scrim._down) closeSheet(); });
  document.body.appendChild(scrim);
  ui.modal = {el:scrim, onUpdate:opts.onUpdate || null, onClose:opts.onClose || null};
  mount && mount($(".sheet", scrim));
  const f = $("[autofocus]", scrim); if (f && matchMedia("(pointer:fine)").matches) f.focus();
}
function closeSheet() { if (ui.modal) { const m = ui.modal; ui.modal = null; m.onClose && m.onClose(); m.el.remove(); } }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
document.addEventListener("click", e => {
  const z = e.target.closest("img[data-zoom]"); if (!z) return;
  const scrim = document.createElement("div"); scrim.className = "scrim"; scrim.style.zIndex = 2500;
  scrim.innerHTML = `<div class="sheet lightbox"><img src="${esc(z.src)}" alt="Submitted photo"><div class="actions"><a class="btn" href="${esc(z.src)}" target="_blank" rel="noopener">Open full size</a><button class="btn primary" type="button">Close</button></div></div>`;
  scrim.addEventListener("click", ev => { if (ev.target === scrim || ev.target.closest("button")) scrim.remove(); });
  document.body.appendChild(scrim);
});
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied " + text); } catch (e) { toast(text); }
}
const photoTag = (url, size = 96) => url ? `<img class="ph" src="${esc(url)}" alt="Submitted photo" loading="lazy" data-zoom style="width:${size}px;height:${size}px">` : "";

/* ---------- photos ---------- */
async function uploadPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const r = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, "image/jpeg", .82));
    const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
    const path = `${new Date().toISOString().slice(0,10)}/${id}.jpg`;
    const {error} = await sb.storage.from("photos").upload(path, blob, {contentType:"image/jpeg", upsert:false});
    if (error) throw new Error("The photo couldn't be uploaded. Try again.");
    return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
}
function photoPicker(sh, inputId, prevId, onFile) {
  const ph = $("#" + inputId, sh); if (!ph) return;
  ph.onchange = () => { const f = ph.files[0] || null; onFile(f); const pv = $("#" + prevId, sh); if (f) { pv.innerHTML = ""; const im = document.createElement("img"); im.alt = "Selected photo"; im.src = URL.createObjectURL(f); pv.appendChild(im); } };
}

/* ---------- map ---------- */
const dark = matchMedia("(prefers-color-scheme: dark)").matches;
function makeMap(el) {
  const m = L.map(el, {zoomControl:false, attributionControl:true, zoomSnap:0.25, zoomDelta:0.5}).setView([52.2, 5.3], 7);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(m);
  m._layers_ = {mask:null, area:null, pts:L.layerGroup().addTo(m), extra:L.layerGroup().addTo(m), me:L.layerGroup().addTo(m)};
  return m;
}
const bboxBounds = b => L.latLngBounds([b.s, b.w], [b.n, b.e]);
function drawArea(m, b) {
  const key = JSON.stringify(b || null); if (m._areaKey === key) return; m._areaKey = key;
  if (m._layers_.mask) m.removeLayer(m._layers_.mask);
  if (m._layers_.area) m.removeLayer(m._layers_.area);
  m._layers_.mask = m._layers_.area = null;
  if (!b) return;
  const css = getComputedStyle(document.documentElement);
  m._layers_.mask = L.polygon([[[-85,-180],[-85,180],[85,180],[85,-180]], [[b.s,b.w],[b.n,b.w],[b.n,b.e],[b.s,b.e]]],
    {stroke:false, fillColor:"#0E2724", fillOpacity:dark ? .45 : .28, interactive:false}).addTo(m);
  m._layers_.area = L.rectangle(bboxBounds(b), {color:css.getPropertyValue("--brand").trim() || BRAND, weight:2, dashArray:"6 5", fill:false, interactive:false}).addTo(m);
}
function fitArea(m) { m.invalidateSize(); const b = cfg().bbox; if (b) m.fitBounds(bboxBounds(b), {padding:[20,20]}); else m.setView([52.2, 5.3], 7); }
function zoomBtns(m) { return {zin:() => m.zoomIn(), zout:() => m.zoomOut(), zfit:() => fitArea(m)}; }

/* ---------- geolocation (teams) ---------- */
function startGeo() {
  if (geo.watch != null || !navigator.geolocation) { if (!navigator.geolocation) geo.err = "unsupported"; return; }
  geo.watch = navigator.geolocation.watchPosition(p => {
    geo.lat = p.coords.latitude; geo.lng = p.coords.longitude; geo.acc = p.coords.accuracy; geo.at = Date.now(); geo.err = null;
    onGeo();
  }, e => { geo.err = e.code === 1 ? "denied" : "unavailable"; onGeo(); }, {enableHighAccuracy:true, maximumAge:4000, timeout:20000});
}
function stopGeo() { if (geo.watch != null) navigator.geolocation.clearWatch(geo.watch); geo.watch = null; }
const geoFresh = () => geo.lat != null && Date.now() - geo.at < 60000;
const effDist = p => geoFresh() ? Math.max(0, distM(geo.lat, geo.lng, p.lat, p.lng) - Math.min(geo.acc || 0, 20)) : null;
const canUnlock = p => { const d = effDist(p); return d != null && d <= (p.radius || cfg().radius || 15); };
// the one or two places a team can unlock right now: its next stop, or its claimed bonus
const lockedTargets = () => [...S.points.filter(p => p.is_next && !p.unlocked), ...S.bonuses.filter(b => b.mine && !b.unlocked).map(b => ({...b, bonus:true}))];
function onGeo() {
  if (ui.screen !== "team" || !S) return;
  drawMe();
  updateGeoChip();
  // arrival notice
  if (status() === "live") for (const p of lockedTargets()) {
    if (canUnlock(p) && !geo.near.has(p.id)) { geo.near.add(p.id); toast(p.bonus ? "You've reached your bonus location — tap the gold pin" : "You've reached your next stop — tap it to unlock"); if (navigator.vibrate) navigator.vibrate(120); drawTeamMarkers(true); }
    else if (geo.near.has(p.id) && !canUnlock(p)) { geo.near.delete(p.id); drawTeamMarkers(true); }
  }
  if (geoFresh() && Date.now() - geo.lastPing > 45000 && status() === "live") { geo.lastPing = Date.now(); sb.rpc("team_action", {p_code:session.code, p_action:"ping", p:{lat:geo.lat, lng:geo.lng}}).then(() => {}, () => {}); }
  if (ui.modal && ui.modal.onGeo) ui.modal.onGeo();
}

/* ================= LOGIN ================= */
function renderLogin(err = "") {
  ui.screen = "login"; stopGeo();
  app.innerHTML = `<div class="login"><div class="login-card">
    <div class="org"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--brand)" stroke-width="2"/><path d="M12 4l3 8-3 8-3-8z" fill="var(--gold)"/><path d="M12 4l3 8H9z" fill="var(--brand)"/></svg>ABN AMRO Investments · Team event</div>
    <h1>The Investment <em>Trail</em></h1>
    <p class="muted" style="margin:0">Enter the code you received from the organiser to open your team's map.</p>
    <form class="codebox" id="loginf" autocomplete="off">
      <label for="code" class="eyebrow">Your code</label>
      <input id="code" name="code" placeholder="ABC-123" maxlength="24" autocapitalize="characters" spellcheck="false" autofocus>
      <div class="err" role="alert">${esc(err)}</div>
      <button class="btn primary big" id="login-go">Start</button>
    </form>
    <button type="button" class="btn ghost" data-act="info" style="justify-self:start;padding-left:0">${I.info} How the hunt works</button>
    <div class="legend"><span class="chip"><i class="dot" style="background:${KINDS.question.c}"></i>Question</span><span class="chip"><i class="dot" style="background:${KINDS.assignment.c}"></i>Assignment</span><span class="chip"><i class="dot" style="background:${KINDS.activity.c}"></i>Activity</span><span class="chip"><i class="dot" style="background:${GOLD}"></i>Bonus</span></div>
  </div></div>`;
  const inp = $("#code");
  inp.addEventListener("input", () => { const v = norm(inp.value); inp.value = v.length > 3 && v.length <= 6 ? v.slice(0,3) + "-" + v.slice(3) : inp.value.toUpperCase(); });
  $("#loginf").addEventListener("submit", async e => {
    e.preventDefault(); const code = inp.value.trim(); if (!norm(code)) return;
    const btn = $("#login-go"); btn.disabled = true; btn.textContent = "Checking…";
    try {
      const r = await rpc("login", {p_code:code});
      if (!r) { renderLogin("That code isn't recognised. Check it with the organiser."); return; }
      saveSession({role:r.role, code}); lastJSON = ""; S = null;
      app.innerHTML = `<div class="loading">Opening the map…</div>`; ui.screen = null;
      await refresh();
    } catch (err) { renderLogin(err.message); }
  });
}

/* ================= TEAM ================= */
let tmap = null;
function renderTeamShell() {
  ui.screen = "team";
  app.innerHTML = `
    <header class="topbar">
      <div class="ttl"><div class="eyebrow" id="t-hunt"></div><h2 id="t-name"></h2></div>
      <div class="score"><b id="t-score">0</b><span>points</span></div>
      <button class="iconbtn" data-act="info" aria-label="How the hunt works">${I.info}</button>
      <button class="iconbtn" data-act="t-chat" aria-label="Chat with the organiser">${I.chat}<span id="t-unread"></span></button>
      <button class="iconbtn" data-act="t-team" aria-label="Team details">${I.team}</button>
    </header>
    <div id="t-bonus"></div>
    <div class="mapwrap">
      <div class="map" id="t-map"></div>
      <div class="hud"><div class="progressbar" id="t-prog"></div><span class="chip gps" id="t-gps"></span></div>
      <div class="maptools"><button data-act="locate" id="t-locate" aria-label="Centre on my location">${I.me}</button><button data-act="zin" aria-label="Zoom in">+</button><button data-act="zout" aria-label="Zoom out">−</button><button data-act="zfit" aria-label="Show the whole hunt area">${I.fit}</button></div>
      <div class="legend-float"><span class="chip"><i class="dot" style="background:${KINDS.question.c}"></i>Question</span><span class="chip"><i class="dot" style="background:${KINDS.assignment.c}"></i>Assignment</span><span class="chip"><i class="dot" style="background:${KINDS.activity.c}"></i>Activity</span></div>
      <div id="t-over"></div>
    </div>`;
  tmap = makeMap($("#t-map"));
  tmap.on("dragstart", () => { ui.follow = false; $("#t-locate").classList.remove("on"); });
  ui.follow = false;
  setTimeout(() => { tmap.invalidateSize(); fitArea(tmap); }, 0);
  startGeo();
}
function updateGeoChip() {
  const el = $("#t-gps"); if (!el) return;
  if (geo.err === "denied") { el.className = "chip gps bad"; el.textContent = "Location blocked — allow it in your browser to unlock tasks"; }
  else if (geo.err === "unsupported") { el.className = "chip gps bad"; el.textContent = "This browser can't share your location"; }
  else if (!geoFresh()) { el.className = "chip gps"; el.textContent = "Finding your location…"; }
  else { el.className = "chip gps"; el.innerHTML = `<i class="dot" style="background:var(--me)"></i>GPS ±${Math.round(geo.acc)} m`; }
}
function drawMe() {
  if (!tmap) return; const g = tmap._layers_.me; g.clearLayers();
  if (!geoFresh()) return;
  const css = getComputedStyle(document.documentElement).getPropertyValue("--me").trim() || "#1A73E8";
  L.circle([geo.lat, geo.lng], {radius:geo.acc || 10, color:css, weight:1, fillColor:css, fillOpacity:.12, interactive:false}).addTo(g);
  L.circleMarker([geo.lat, geo.lng], {radius:7, color:"#fff", weight:3, fillColor:css, fillOpacity:1, interactive:false}).addTo(g);
  if (ui.follow) tmap.panTo([geo.lat, geo.lng], {animate:true});
}
let tMarkKey = "";
function drawTeamMarkers(force) {
  const c = cfg(), st = status(), tid = S.team_id;
  const marks = [];
  if (st !== "setup") {
    for (const p of S.points) {
      const s = subFor(tid, p.id), done = s && s.status !== "rejected", near = !p.unlocked && geo.near.has(p.id);
      marks.push({id:p.id, type:"point", lat:p.lat, lng:p.lng, svg:pinSVG(KINDS[p.kind].c, done ? pinCheck : p.unlocked ? pinNum(p.seq) : pinLock), cls:(done ? "done" : "") + (near ? " near" : ""), r:p.unlocked || done ? 0 : p.radius, z:done ? 0 : 500});
    }
    for (const b of (st === "live" ? S.bonuses : [])) {
      const near = b.mine && !b.unlocked && geo.near.has(b.id);
      marks.push({id:b.id, type:"bonus", lat:b.lat, lng:b.lng, svg:pinSVG(GOLD, b.mine && b.unlocked ? pinStar : b.mine ? pinLock : pinStar, "#2A2200"), cls:near ? "near" : "", r:b.mine && !b.unlocked ? b.radius : 0, z:800});
    }
    if (c.all_done && c.finish) marks.push({id:"finish", type:"finish", lat:c.finish.lat, lng:c.finish.lng, svg:pinSVG(BRAND, pinFlag), cls:"near", z:900});
  }
  const key = JSON.stringify(marks); if (!force && key === tMarkKey) return; tMarkKey = key;
  const g = tmap._layers_.pts; g.clearLayers();
  for (const m of marks) {
    if (m.r) L.circle([m.lat, m.lng], {radius:m.r, color:"#56706B", weight:1, dashArray:"3 4", fill:false, interactive:false}).addTo(g);
    L.marker([m.lat, m.lng], {icon:pinIcon(m.svg, m.cls), keyboard:true, zIndexOffset:m.z, title:m.type === "finish" ? "Finish" : m.type === "bonus" ? "Bonus task" : ""})
      .on("click", () => m.type === "finish" ? openCompass() : m.type === "bonus" ? openBonus(m.id) : openPoint(m.id)).addTo(g);
  }
}

function updateTeam() {
  const tid = S.team_id, t = teamById(tid);
  if (!t) { saveSession(null); render(true); return; }
  const c = cfg(), st = status();
  $("#t-hunt").textContent = c.title || "The Investment Trail";
  $("#t-name").textContent = t.name;
  $("#t-score").textContent = t.score || 0;
  const un = unreadFor(tid, "team"); $("#t-unread").innerHTML = un ? `<span class="badge">${un}</span>` : "";
  const total = c.points_total || 0, done = doneCount(tid);
  patch($("#t-prog"), `<div class="row"><span>Progress</span><span class="num">${done} / ${total}</span></div><div class="bar"><i style="width:${total ? done / total * 100 : 0}%"></i></div>`);
  $("#t-prog").hidden = st !== "live";
  updateGeoChip();
  drawArea(tmap, c.bbox);
  if (!tmap._fitted && c.bbox) { tmap._fitted = true; fitArea(tmap); }
  drawTeamMarkers();
  drawMe();
  // bonus
  const vb = st === "live" ? S.bonuses : [];
  const mine = vb.find(b => b.mine), free = vb.filter(b => !b.mine);
  let bh = "";
  if (mine) bh = `<div class="bonusbar">${I.star}<div class="txt"><small>${mine.unlocked ? "Your bonus task · finish it to continue" : "Your bonus task · walk to the gold pin"} · +${mine.value} pts</small><b>${esc(mine.title)}</b></div><button class="btn sm" data-act="t-bonus" data-id="${mine.id}">Open</button></div>`;
  else if (free.length) { const b = free[0]; bh = `<div class="bonusbar">${I.star}<div class="txt"><small>Bonus task on the map${free.length > 1 ? ` (${free.length})` : ""} · +${b.value} pts · first team to claim it</small><b>${esc(b.title)}</b></div><button class="btn sm" data-act="t-bonus" data-id="${b.id}">View</button></div>`; }
  const bonEl = $("#t-bonus");
  const key = mine ? "m" + mine.id : free.length ? "f" + free.map(b => b.id).join(",") : "";
  if (bonEl.dataset.key !== key) {
    const prev = bonEl.dataset.key; bonEl.dataset.key = key; bonEl.innerHTML = bh;
    if (key && prev !== undefined && key.startsWith("f") && !(prev || "").includes(free[0].id)) { toast("New bonus task — be the first to claim it!"); if (navigator.vibrate) navigator.vibrate([80, 60, 80]); }
    setTimeout(() => tmap.invalidateSize(), 50);
  }
  // overlays
  let ov = "";
  if (st === "setup") ov = `<div class="overlay-card"><div class="eyebrow">Get ready</div><h2>The hunt starts soon</h2><p class="muted" style="margin:0">The organiser will open the map when everyone is ready. Meanwhile, set your team name, add your team members and allow location access.</p><button class="btn primary" data-act="t-team">${I.team} Edit team details</button></div>`;
  else if (st === "ended") {
    const rk = ranking(); const w = teamById(c.winner_id) || (rk[0] && rk[0].t); const myRank = rk.findIndex(r => r.t.id === tid) + 1;
    ov = `<div class="overlay-card"><div class="eyebrow">The hunt is over</div>${w ? `<div class="winner"><span class="eyebrow" style="color:inherit">Winner</span><b>${esc(w.name)}</b><span class="num">${w.score} points</span></div>` : ""}<p style="margin:0">${w && w.id === tid ? "Congratulations — that's you!" : `Your team finished <b>#${myRank}</b> with <b class="num">${t.score}</b> points.`}</p>
      <div class="list" style="text-align:left">${rk.slice(0, 6).map((r, i) => `<div class="item"><span class="rank">${i + 1}</span><div class="main"><b>${esc(r.t.name)}</b></div><b class="num">${r.score}</b></div>`).join("")}</div></div>`;
  } else if (c.all_done && c.finish) ov = `<div class="finishcta"><button class="btn primary" data-act="t-compass">${I.nav} All done — find the finish</button></div>`;
  else if (!c.points_total) ov = `<div class="overlay-card"><h2>No tasks yet</h2><p class="muted" style="margin:0">The organiser is still placing the points. They'll appear on the map automatically.</p></div>`;
  patch($("#t-over"), ov);
  $(".legend-float").hidden = !!(c.all_done && c.finish) || st !== "live";
  if (ui.modal && ui.modal.onUpdate) ui.modal.onUpdate();
}

function distanceBlock(t) {
  const ok = canUnlock(t), raw = geoFresh() ? distM(geo.lat, geo.lng, t.lat, t.lng) : null;
  return `<div class="distance${ok ? " near" : ""}">${raw == null
    ? `<span class="muted">${geo.err === "denied" ? "Location is blocked. Allow location access for this site in your browser settings." : "Waiting for your location…"}</span>`
    : `<b>${fmtDist(raw)}</b><span class="muted">${ok ? "You're here! Unlock the task." : `Get within ${t.radius} m to unlock this task`}</span>`}</div>`;
}
function openPoint(id) {
  const tid = S.team_id;
  let photoFile = null, busy = false;
  const point = () => S.points.find(x => x.id === id);
  const draw = sh => {
    const p = point(); if (!p) { closeSheet(); return; }
    const k = KINDS[p.kind] || KINDS.question;
    const s = subFor(tid, p.id);
    const head = `<div class="sheet-h"><div class="numpin" style="background:${k.c}"><span>${p.seq}</span></div><div class="t"><div class="eyebrow" style="color:${k.c}">Stop ${p.seq} of ${cfg().points_total} · ${k.label} · ${p.value} pts · ${RESP[p.resp] || ""}</div><h2>${esc(p.title)}</h2></div><button class="btn ghost sm" data-close>Close</button></div>`;
    if (!p.unlocked) {
      const ok = canUnlock(p), live = status() === "live";
      sh.innerHTML = `${head}
        <div id="pt-dist">${distanceBlock(p)}</div>
        <div class="actions"><a class="btn" href="${gmaps(p.lat, p.lng)}" target="_blank" rel="noopener">${I.nav} Walk here</a><button class="btn primary" id="pt-unlock" ${ok && live ? "" : "disabled"}>${I.lock} Unlock task</button></div>
        ${!live ? `<p class="hint" style="margin:0">Tasks can be unlocked while the hunt is live.</p>` : ""}`;
      $("[data-close]", sh).onclick = closeSheet;
      $("#pt-unlock", sh).onclick = async e => {
        const b = e.currentTarget; b.disabled = true; b.textContent = "Checking location…";
        const r = await act({point_id:p.id, lat:geo.lat, lng:geo.lng, acc:geo.acc}, "unlock");
        if (r.ok) { toast("Unlocked!"); }
        else if (r.reason === "too_far") { toast(`The server measured ${r.dist} m. Move a bit closer and try again.`); b.disabled = false; b.innerHTML = `${I.lock} Unlock task`; }
        else if (r.reason === "bonus_first") { toast("Finish your bonus task first."); closeSheet(); }
        else if (r.reason) { toast("This task can't be unlocked right now."); b.disabled = false; b.innerHTML = `${I.lock} Unlock task`; }
      };
      return;
    }
    const st = s ? (s.status === "ok" ? `<div class="status ok"><b>Approved · +${s.awarded} pts</b></div>` : s.status === "rejected" ? `<div class="status rejected"><div><b>Not accepted</b>${s.note ? `<div>${esc(s.note)}</div>` : ""}<div class="hint">You can try again below.</div></div></div>` : `<div class="status review"><b>Submitted · waiting for the organiser to check</b></div>`) : "";
    const prev = s ? `<div style="display:grid;gap:8px">${s.body ? `<div class="prompt" style="font-size:14px">${esc(s.body)}</div>` : ""}${photoTag(s.photo, 120)}</div>` : "";
    const canAnswer = status() === "live" && (!s || s.status === "rejected");
    sh.innerHTML = `${head}
      ${p.prompt ? `<div class="prompt">${esc(p.prompt)}</div>` : ""}
      ${st}${prev}
      ${canAnswer ? `<form class="form" id="ansf">
        ${p.resp !== "photo" ? `<label>Your answer<textarea id="ans-text" rows="3" placeholder="Type your answer"></textarea></label>` : ""}
        ${p.resp !== "text" ? `<div class="photo-pick"><label class="btn" for="ans-photo">${I.cam} Take or add photo</label><input type="file" id="ans-photo" accept="image/*" capture="environment" hidden><span id="ans-prev" class="hint">A photo is required</span></div>` : ""}
        <div class="actions"><button class="btn primary" id="ans-go">Submit</button></div></form>` : ""}`;
    $("[data-close]", sh).onclick = closeSheet;
    photoPicker(sh, "ans-photo", "ans-prev", f => photoFile = f);
    const f = $("#ansf", sh);
    if (f) f.onsubmit = async e => {
      e.preventDefault();
      const text = ($("#ans-text", sh) ? $("#ans-text", sh).value : "").trim();
      if (p.resp !== "photo" && !text) return toast("Type your answer first.");
      if (p.resp !== "text" && !photoFile) return toast("Add a photo first.");
      const btn = $("#ans-go", sh); btn.disabled = true; btn.textContent = photoFile ? "Uploading photo…" : "Sending…"; busy = true;
      try {
        const photo = photoFile ? await uploadPhoto(photoFile) : null;
        const r = await act({target:"point", target_id:p.id, body:text, photo}, "submit");
        if (r.ok) { toast(r.status === "ok" ? `Correct! +${r.awarded} points` : "Submitted — the organiser will check it."); photoFile = null; busy = false; closeSheet(); return; }
        if (r.reason === "already") toast("You already answered this one.");
      } catch (err) { toast(err.message); }
      busy = false; btn.disabled = false; btn.textContent = "Submit";
    };
  };
  const keyOf = () => JSON.stringify([point(), subFor(tid, id) || null, status()]);
  let last = keyOf();
  openSheet("", draw, {
    onUpdate: () => { const sh = $(".sheet"); const k = keyOf(); if (!sh || k === last || busy || photoFile) return; const typed = $("#ans-text", sh); if (typed && typed.value.trim()) return; last = k; draw(sh); },
  });
  ui.modal.onGeo = () => { const p = point(); const sh = $(".sheet"); if (p && !p.unlocked && sh) draw(sh); };
}

function openBonus(id) {
  let file = null, busy = false;
  const draw = sh => {
    const b = S.bonuses.find(x => x.id === id);
    if (!b) { sh.innerHTML = `<div class="sheet-h"><div class="t"><h2>This bonus task is gone</h2><p class="muted">Another team claimed it first, or the organiser closed it.</p></div><button class="btn ghost sm" data-close>Close</button></div>`; $("[data-close]", sh).onclick = closeSheet; return; }
    const head = `<div class="sheet-h"><div class="numpin" style="background:${GOLD};color:#2A2200"><span>★</span></div><div class="t"><div class="eyebrow">Bonus task · +${b.value} pts · ${RESP[b.resp]}</div><h2>${esc(b.title)}</h2></div><button class="btn ghost sm" data-close>Close</button></div>`;
    if (!b.mine) {
      sh.innerHTML = `${head}<p style="margin:0">Only one team can do this task at a time. When you claim it, it disappears for the other teams and <b>your next stop stays hidden until you've finished the bonus</b>. Walk to the gold pin to unlock the instructions.</p>
        ${geoFresh() ? `<p class="muted" style="margin:0">It's ${fmtDist(distM(geo.lat, geo.lng, b.lat, b.lng))} away.</p>` : ""}
        <div class="actions"><button class="btn" data-close>Not now</button><button class="btn gold" id="b-claim">${I.star} Claim bonus task</button></div>`;
    } else if (!b.unlocked) {
      sh.innerHTML = `${head}<div>${distanceBlock(b)}</div>
        <div class="actions"><a class="btn" href="${gmaps(b.lat, b.lng)}" target="_blank" rel="noopener">${I.nav} Walk here</a><button class="btn gold" id="b-unlock" ${canUnlock(b) ? "" : "disabled"}>${I.lock} Unlock bonus</button></div>
        <p class="hint" style="margin:0">Your next stop appears again once you've submitted this bonus task.</p>`;
    } else {
      sh.innerHTML = `${head}<div class="prompt">${esc(b.prompt || "")}</div>
        <form class="form" id="bf">${b.resp !== "photo" ? `<label>Your answer<textarea id="b-text" rows="3"></textarea></label>` : ""}${b.resp !== "text" ? `<div class="photo-pick"><label class="btn" for="b-photo">${I.cam} Take or add photo</label><input type="file" id="b-photo" accept="image/*" capture="environment" hidden><span id="b-prev" class="hint">A photo is required</span></div>` : ""}
        <div class="actions"><button class="btn primary" id="b-go">Submit bonus</button></div></form>`;
    }
    $$("[data-close]", sh).forEach(x => x.onclick = closeSheet);
    const cl = $("#b-claim", sh);
    if (cl) cl.onclick = async () => { cl.disabled = true; cl.textContent = "Claiming…"; const r = await act({bonus_id:id}, "claim"); if (r.ok) toast("It's yours! Walk to the gold pin."); else { toast(r.reason === "bonus_first" ? "Finish your current bonus task first." : "Too late — another team claimed it."); closeSheet(); } };
    const un = $("#b-unlock", sh);
    if (un) un.onclick = async () => { un.disabled = true; un.textContent = "Checking location…"; const r = await act({bonus_id:id, lat:geo.lat, lng:geo.lng, acc:geo.acc}, "unlock");
      if (r.ok) toast("Unlocked!"); else { toast(r.reason === "too_far" ? `The server measured ${r.dist} m. Move a bit closer and try again.` : "This bonus can't be unlocked right now."); un.disabled = false; un.innerHTML = `${I.lock} Unlock bonus`; } };
    photoPicker(sh, "b-photo", "b-prev", f => file = f);
    const f = $("#bf", sh);
    if (f) f.onsubmit = async e => {
      e.preventDefault(); const text = ($("#b-text", sh) ? $("#b-text", sh).value : "").trim();
      if (b.resp !== "photo" && !text) return toast("Type your answer first.");
      if (b.resp !== "text" && !file) return toast("Add a photo first.");
      const btn = $("#b-go", sh); btn.disabled = true; btn.textContent = file ? "Uploading photo…" : "Sending…"; busy = true;
      try { const photo = file ? await uploadPhoto(file) : null; const r = await act({target:"bonus", target_id:id, body:text, photo}, "submit", r => r.status === "ok" ? `Correct! +${r.awarded} bonus points` : "Bonus submitted — the organiser will check it. On to your next stop!"); if (r.ok) { busy = false; file = null; closeSheet(); return; } }
      catch (err) { toast(err.message); }
      busy = false; btn.disabled = false; btn.textContent = "Submit bonus";
    };
  };
  const keyOf = () => JSON.stringify(S.bonuses.find(x => x.id === id) || null);
  let last = keyOf();
  openSheet("", draw, {onUpdate: () => { const sh = $(".sheet"); const k = keyOf(); if (!sh || k === last || busy || file) return; const t = $("#b-text", sh); if (t && t.value.trim()) return; last = k; draw(sh); }});
  ui.modal.onGeo = () => { const b = S.bonuses.find(x => x.id === id); const sh = $(".sheet"); if (b && !(b.mine && b.unlocked) && sh && !busy) draw(sh); };
}

function openInfo() {
  const c = S && S.config || {}, r = c.radius || 15;
  const dot = col => `<i class="dot" style="background:${col}"></i>`;
  const sec = (title, body) => `<section class="info-sec"><h3>${title}</h3>${body}</section>`;
  openSheet(`<div class="sheet-h"><div class="t"><div class="eyebrow">${esc(c.title || "The Investment Trail")}</div><h2>How the hunt works</h2></div><button class="btn ghost sm" data-close>Close</button></div>
    <div class="info">
    ${sec("The idea", `<p>Your team walks a route past a series of stops on the map. At every stop there's a task. Complete them all, collect as many points as you can, and finish at the end point. The team with the most points wins.</p>`)}
    ${sec("Before you start", `<ul>
      <li>Allow <b>location access</b> when your browser asks. The map needs it to unlock tasks.</li>
      <li>Tap ${I.team} at the top to set your <b>team name</b> and add your <b>team members</b>.</li>
      <li>Keep this page open on one phone per team. Your code logs you back in if you close it.</li></ul>`)}
    ${sec("Your route", `<ul>
      <li>You only ever see your <b>next stop</b>. Each team starts somewhere different, so don't follow the others.</li>
      <li>The blue dot is you. Tap ${I.me} to centre the map on your location, and use <b>Walk here</b> to open directions.</li>
      <li>Stops are locked ${I.lock} until you're within <b>${r} metres</b>. Tap the pin and press <b>Unlock task</b> when you're there.</li>
      <li>Answer or upload a photo, then press <b>Submit</b>. Your next stop appears straight away.</li></ul>`)}
    ${sec("What the colours mean", `<ul class="legend-list">
      <li>${dot(KINDS.question.c)}<span><b>Question</b> — type in the answer.</span></li>
      <li>${dot(KINDS.assignment.c)}<span><b>Assignment</b> — do something and show it, usually with a photo.</span></li>
      <li>${dot(KINDS.activity.c)}<span><b>Activity</b> — a team challenge on the spot.</span></li>
      <li>${dot(GOLD)}<span><b>Bonus task</b> — extra points, see below.</span></li>
      <li><span style="color:var(--ok);font-weight:800;width:10px;text-align:center">✓</span><span>A faded pin with a tick is a stop you've already done.</span></li></ul>`)}
    ${sec("Points", `<p>Each task shows how many points it's worth. Some answers are checked automatically and score straight away; others are checked by the organiser, so your score can go up a little later. If an answer isn't accepted you'll see why and can try again.</p>`)}
    ${sec("Bonus tasks", `<ul>
      <li>From time to time a <b>yellow bar</b> appears at the top and a gold pin shows up on the map.</li>
      <li>Only <b>one team at a time</b> can do a bonus. The first team to claim it gets it, and it disappears for everyone else.</li>
      <li>Once you claim a bonus you <b>must finish it first</b>: your next stop stays hidden until you've handed it in.</li>
      <li>Walk to the gold pin to unlock the bonus instructions. Each team can do each bonus only once.</li></ul>`)}
    ${sec("Questions?", `<p>Tap ${I.chat} at the top to chat with the organiser. A red number means you have a new message.</p>`)}
    ${sec("The finish", `<p>When every stop is done, a <b>compass</b> points you to the finish. Tap <b>Turn with my phone</b> to let the arrow follow the direction you're facing. The winner is announced when the organiser ends the hunt.</p>`)}
    <p class="hint" style="margin:0">Tip: GPS can be a few metres off between tall buildings. If a stop won't unlock while you're clearly there, message the organiser.</p>
    </div>`, sh => { $("[data-close]", sh).onclick = closeSheet; });
}

function openTeamDetails() {
  const t = teamById(S.team_id);
  openSheet(`<div class="sheet-h"><div class="t"><div class="eyebrow">Your team</div><h2>Team details</h2></div><button class="btn ghost sm" data-close>Close</button></div>
    <form class="form" id="tf"><label>Team name<input id="tf-name" maxlength="40" required value="${esc(t.name)}"></label>
    <label>Team members<textarea id="tf-mem" rows="5" placeholder="One name per line">${esc((t.members || []).join("\n"))}</textarea><small>One name per line.</small></label>
    <div class="actions"><button type="button" class="btn danger" id="tf-out">${I.out} Log out</button><span class="spacer"></span><button class="btn primary">Save</button></div></form>`, sh => {
    $("[data-close]", sh).onclick = closeSheet;
    $("#tf-out", sh).onclick = e => { if (!armed(e.currentTarget, "Tap again to log out")) return; closeSheet(); saveSession(null); S = null; lastJSON = ""; render(true); };
    $("#tf", sh).onsubmit = async e => { e.preventDefault(); const name = $("#tf-name", sh).value.trim(); if (!name) return;
      const members = $("#tf-mem", sh).value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 30);
      const r = await act({name, members}, "profile", "Team details saved"); if (r.ok) closeSheet(); };
  });
}

function chatHTML(tid, side) {
  const ms = S.msgs.filter(m => m.team_id === tid);
  if (!ms.length) return `<div class="empty" style="margin:auto 0"><b>No messages yet</b>${side === "team" ? "Ask the organiser anything about a task." : "Send this team a message."}</div>`;
  const tn = (teamById(tid) || {}).name || "Team";
  return ms.map(m => `<div class="msg${m.sender === side ? " me" : ""}">${esc(m.body)}<time>${m.sender === "admin" ? "Organiser" : esc(tn)} · ${fmtTime(m.at)}</time></div>`).join("");
}
const readSent = {};
function markRead(tid, side) {
  if (!unreadFor(tid, side)) return;
  const key = tid + side, n = S.msgs.length; if (readSent[key] === n) return; readSent[key] = n;
  act(side === "admin" ? {team_id:tid} : {}, "read");
}
async function sendMsg(tid, text) { text = text.trim(); if (!text) return true; const r = await act(session.role === "admin" ? {team_id:tid, body:text} : {body:text}, "msg"); return r.ok; }
function openTeamChat() {
  const tid = S.team_id;
  const draw = sh => { const box = $(".msgs", sh); const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40; patch(box, chatHTML(tid, "team")); if (atEnd || !box._init) { box.scrollTop = box.scrollHeight; box._init = true; } markRead(tid, "team"); };
  openSheet(`<div class="sheet-h"><div class="t"><div class="eyebrow">Chat</div><h2>Ask the organiser</h2></div><button class="btn ghost sm" data-close>Close</button></div>
    <div class="chat"><div class="msgs" style="max-height:50vh"></div><form class="chatform" id="cf"><input id="cf-in" placeholder="Type a message" maxlength="1000" autocomplete="off" autofocus><button class="btn primary">Send</button></form></div>`, sh => {
    $("[data-close]", sh).onclick = closeSheet; draw(sh);
    $("#cf", sh).onsubmit = async e => { e.preventDefault(); const i = $("#cf-in", sh); const v = i.value; i.value = ""; if (!(await sendMsg(tid, v))) i.value = v; };
  }, {onUpdate: () => { const sh = $(".sheet"); sh && draw(sh); }});
}

function openCompass() {
  const c = cfg(); if (!c.finish) return;
  let heading = null, onOri = null;
  const ticks = Array.from({length:72}, (_, i) => { const a = i * 5 * Math.PI / 180, r1 = i % 18 === 0 ? 92 : i % 2 ? 100 : 96; return `<line x1="${120 + Math.sin(a) * r1}" y1="${120 - Math.cos(a) * r1}" x2="${120 + Math.sin(a) * 104}" y2="${120 - Math.cos(a) * 104}" stroke="var(--muted)" stroke-width="${i % 18 === 0 ? 2.5 : 1}"/>`; }).join("");
  const letters = ["N","E","S","W"].map((l, i) => `<text x="${120 + Math.sin(i * Math.PI / 2) * 78}" y="${126 - Math.cos(i * Math.PI / 2) * 78}" text-anchor="middle" font-family="Red Hat Display,system-ui,sans-serif" font-weight="800" font-size="17" fill="${l === "N" ? "var(--bad)" : "var(--ink)"}">${l}</text>`).join("");
  openSheet(`<div class="sheet-h"><div class="t"><div class="eyebrow">All tasks done</div><h2>${esc(c.finish_title || "The finish")}</h2></div><button class="btn ghost sm" data-close>Close</button></div>
    <svg class="compass" viewBox="0 0 240 240" role="img" aria-label="Compass pointing towards the finish">
      <g class="dial"><circle cx="120" cy="120" r="112" fill="var(--surface-2)" stroke="var(--line)" stroke-width="2"/>${ticks}${letters}
      <g class="needle"><path d="M120 30L132 120H108Z" fill="var(--brand)"/><path d="M120 210L132 120H108Z" fill="var(--muted)" opacity=".45"/></g></g>
      <circle cx="120" cy="120" r="9" fill="var(--gold)" stroke="var(--surface)" stroke-width="3"/>
    </svg>
    <p style="margin:0;text-align:center" id="cp-read"></p>
    ${c.finish_text ? `<div class="prompt">${esc(c.finish_text)}</div>` : ""}
    <div class="actions"><button class="btn" id="cp-live" ${window.DeviceOrientationEvent ? "" : "hidden"}>Turn with my phone</button><a class="btn primary" href="${gmaps(c.finish.lat, c.finish.lng)}" target="_blank" rel="noopener">${I.nav} Walk to the finish</a></div>`, sh => {
    $("[data-close]", sh).onclick = closeSheet;
    const upd = () => {
      const has = geoFresh();
      const b = has ? bearing(geo.lat, geo.lng, c.finish.lat, c.finish.lng) : 0;
      const d = has ? distM(geo.lat, geo.lng, c.finish.lat, c.finish.lng) : null;
      $(".needle", sh).style.transform = `rotate(${b}deg)`;
      $(".dial", sh).style.transform = heading != null ? `rotate(${-heading}deg)` : "";
      $("#cp-read", sh).innerHTML = has ? `<b class="num" style="font-family:var(--f-display);font-size:24px">${fmtDist(d)} · ${Math.round(b)}° ${compassWord(b)}</b><br><span class="muted">${heading != null ? "The arrow points the way — hold your phone flat." : "N on the compass is north."}</span>` : `<span class="muted">Waiting for your location…</span>`;
    };
    onOri = e => { const h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null); if (h != null) { heading = h; upd(); } };
    $("#cp-live", sh).onclick = async e => {
      try { if (DeviceOrientationEvent.requestPermission && (await DeviceOrientationEvent.requestPermission()) !== "granted") throw 0;
        window.addEventListener("deviceorientationabsolute", onOri); window.addEventListener("deviceorientation", onOri); e.currentTarget.hidden = true;
        setTimeout(() => { if (heading == null) toast("This phone doesn't share its compass. Use N on the dial."); }, 2500);
      } catch (err) { toast("Compass access was not allowed. Use N on the dial."); }
    };
    ui.modal.onGeo = upd; requestAnimationFrame(upd);
  }, {onClose: () => { if (onOri) { window.removeEventListener("deviceorientationabsolute", onOri); window.removeEventListener("deviceorientation", onOri); } }});
}

/* ================= ADMIN ================= */
let amap = null;
function renderAdminShell() {
  ui.screen = "admin"; stopGeo();
  app.innerHTML = `
    <header class="topbar">
      <div class="ttl"><div class="eyebrow">Organiser</div><h2 id="a-title"></h2></div>
      <span id="a-status" class="hide-sm"></span>
      <span id="a-statusbtn"></span>
      <button class="iconbtn" data-act="a-logout" aria-label="Log out">${I.out}</button>
    </header>
    <div class="admin-body">
      <aside class="panel"><nav class="tabs" id="a-tabs"></nav><div class="pbody" id="a-body"></div></aside>
      <div class="mapwrap">
        <div class="map" id="a-map"></div>
        <div class="modebar" id="a-modes"></div>
        <div class="maptools"><button data-act="zin" aria-label="Zoom in">+</button><button data-act="zout" aria-label="Zoom out">−</button><button data-act="zfit" aria-label="Show the hunt area">${I.fit}</button></div>
        <div id="a-hint"></div>
      </div>
    </div>`;
  amap = makeMap($("#a-map"));
  amap.on("click", e => {
    const {lat, lng} = e.latlng;
    if (ui.mode === "point") { setMode("pan"); openPointEditor(null, {lat, lng}); }
    else if (ui.mode === "bonus") { setMode("pan"); openBonusEditor(null, {lat, lng}); }
    else if (ui.mode === "finish") { setMode("pan"); act({finish:{lat, lng}}, "config", "Finish point set"); }
    else if (ui.mode === "area") {
      if (!ui.areaFirst) { ui.areaFirst = {lat, lng}; amap._layers_.extra.clearLayers(); L.circleMarker([lat, lng], {radius:6, color:BRAND, fillOpacity:1}).addTo(amap._layers_.extra); renderModes(); }
      else { const a = ui.areaFirst; const b = {w:Math.min(a.lng, lng), e:Math.max(a.lng, lng), s:Math.min(a.lat, lat), n:Math.max(a.lat, lat)}; setMode("pan"); act({bbox:b}, "config", "Hunt area saved").then(() => setTimeout(() => fitArea(amap), 100)); }
    }
  });
  setTimeout(() => { amap.invalidateSize(); fitArea(amap); }, 0);
  renderModes();
}
function setMode(m) { ui.mode = m; ui.areaFirst = null; if (amap) amap._layers_.extra.clearLayers(); renderModes(); }
function renderModes() {
  const m = ui.mode;
  $("#a-modes").innerHTML = [["pan","Browse"],["area","Select area"],["point","Add point"],["bonus","Add bonus"],["finish","Set finish"]].map(([k, l]) => `<button class="btn${m === k ? " on" : ""}" data-act="mode" data-mode="${k}">${l}</button>`).join("");
  const hints = {area:ui.areaFirst ? "Now tap the opposite corner of the area" : "Tap one corner of the hunt area", point:"Tap the map where the new point should go", bonus:"Tap the map where the bonus task should be", finish:"Tap the map where the finish is"};
  $("#a-hint").innerHTML = hints[m] ? `<div class="maphint">${hints[m]} · <button class="btn sm ghost" style="color:inherit;min-height:24px" data-act="mode" data-mode="pan">Cancel</button></div>` : "";
  if (amap) amap.getContainer().style.cursor = m === "pan" ? "" : "crosshair";
}
let aMarkKey = "", dragging = false;
function drawAdminMarkers() {
  if (dragging) return;
  const c = cfg();
  const key = JSON.stringify([S.points.map(p => [p.id, p.lat, p.lng, p.kind, p.n, p.radius]), S.bonuses.map(b => [b.id, b.lat, b.lng, b.radius, b.released, b.claim_team]), c.finish, c.radius, S.teams.map(t => [t.id, t.name, t.last_lat, t.last_lng, t.last_seen && Math.floor(T(t.last_seen) / 60000)])]);
  if (key === aMarkKey) return; aMarkKey = key;
  const g = amap._layers_.pts; g.clearLayers();
  for (const p of S.points) {
    L.circle([p.lat, p.lng], {radius:p.radius || c.radius || 15, color:KINDS[p.kind].c, weight:1, fillOpacity:.08, interactive:false}).addTo(g);
    const mk = L.marker([p.lat, p.lng], {icon:pinIcon(pinSVG(KINDS[p.kind].c, pinNum(p.n))), draggable:true, title:p.title})
      .on("click", () => openPointEditor(p.id))
      .on("dragstart", () => dragging = true)
      .on("dragend", e => { dragging = false; const ll = e.target.getLatLng(); act({id:p.id, lat:ll.lat, lng:ll.lng}, "point_save", "Point moved"); });
    mk.addTo(g);
  }
  for (const b of S.bonuses) if (b.lat != null) {
    L.circle([b.lat, b.lng], {radius:b.radius || c.radius || 15, color:"#B89300", weight:1, fillOpacity:.08, interactive:false}).addTo(g);
    L.marker([b.lat, b.lng], {icon:pinIcon(pinSVG(GOLD, pinStar, "#2A2200"), b.released ? "" : "done"), draggable:true, title:"Bonus: " + b.title, zIndexOffset:300})
      .on("click", () => openBonusEditor(b.id))
      .on("dragstart", () => dragging = true)
      .on("dragend", e => { dragging = false; const ll = e.target.getLatLng(); act({id:b.id, lat:ll.lat, lng:ll.lng}, "bonus_save", "Bonus moved"); }).addTo(g);
  }
  if (c.finish) L.marker([c.finish.lat, c.finish.lng], {icon:pinIcon(pinSVG(BRAND, pinFlag)), draggable:true, title:"Finish"})
    .on("click", () => { ui.tab = "settings"; renderAdminPanel(true); })
    .on("dragstart", () => dragging = true)
    .on("dragend", e => { dragging = false; const ll = e.target.getLatLng(); act({finish:{lat:ll.lat, lng:ll.lng}}, "config", "Finish moved"); }).addTo(g);
  for (const t of S.teams) if (t.last_lat != null) {
    const stale = Date.now() - T(t.last_seen) > 5 * 60000;
    L.marker([t.last_lat, t.last_lng], {icon:L.divIcon({className:"teamicon", html:`<div class="${stale ? "stale" : ""}">${esc(t.name)} · ${ago(t.last_seen)}</div>`, iconSize:[0,0]}), interactive:false, zIndexOffset:-100}).addTo(g);
  }
}
function updateAdmin() {
  const c = cfg(), st = status();
  $("#a-title").textContent = c.title || "The Investment Trail";
  $("#a-status").innerHTML = `<span class="statuspill st-${st}">${st === "setup" ? "Not started" : st === "live" ? "Live" : "Ended"}</span>`;
  const sb_ = $("#a-statusbtn");
  if (sb_._st !== st) { sb_._st = st; sb_.innerHTML = st === "setup" ? `<button class="btn primary sm" data-act="a-start">Start hunt</button>` : st === "live" ? `<button class="btn gold sm" data-act="a-end">End &amp; pick winner</button>` : `<button class="btn sm" data-act="a-reopen">Reopen</button>`; }
  drawArea(amap, c.bbox);
  if (!amap._fitted && c.bbox) { amap._fitted = true; fitArea(amap); }
  drawAdminMarkers();
  renderAdminPanel();
  if (ui.modal && ui.modal.onUpdate) ui.modal.onUpdate();
}
function renderAdminPanel(force) {
  const review = S.subs.filter(s => s.status === "review").length;
  const unread = S.teams.reduce((a, t) => a + unreadFor(t.id, "admin"), 0);
  const tabs = [["points","Points"],["teams","Teams"],["review","Review", review],["chat","Chat", unread],["bonus","Bonus"],["settings","Settings"]];
  patch($("#a-tabs"), tabs.map(([k, l, n]) => `<button class="tab${ui.tab === k ? " on" : ""}" data-act="tab" data-tab="${k}">${l}${n ? `<span class="badge">${n}</span>` : ""}</button>`).join(""));
  const body = $("#a-body");
  if (body._tab !== ui.tab || force) { body._tab = ui.tab; body._last = null; body.innerHTML = ""; body.scrollTop = 0; }
  ({points:panelPoints, teams:panelTeams, review:panelReview, chat:panelChat, bonus:panelBonus, settings:panelSettings})[ui.tab](body);
}
function ensure(body, id, html) { let el = $("#" + id, body); if (!el) { body.insertAdjacentHTML("beforeend", html); el = $("#" + id, body); } return el; }

function panelPoints(body) {
  ensure(body, "pp-head", `<div id="pp-head" style="display:grid;gap:10px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="flex:1;font-size:18px">Points</h3><button class="btn primary sm" data-act="mode" data-mode="point">+ Add point</button></div><p class="hint" style="margin:0">Tap “Add point”, then tap the map. Drag a pin to move it. Colours: <b style="color:${KINDS.question.c}">question</b>, <b style="color:${KINDS.assignment.c}">assignment</b>, <b style="color:${KINDS.activity.c}">activity</b>. Each team walks the points in number order from its own start point (set under Teams) and only ever sees its next stop. Instructions open once the team is within the radius.</p></div>`);
  const list = ensure(body, "pp-list", `<div id="pp-list" class="list"></div>`);
  patch(list, S.points.length ? S.points.map(p => { const k = KINDS[p.kind]; const n = S.subs.filter(s => s.target_id === p.id && s.status !== "rejected").length;
    return `<div class="item click" data-act="edit-point" data-id="${p.id}"><div class="numpin" style="background:${k.c}"><span>${p.n}</span></div><div class="main"><b>${esc(p.title)}</b><small>${k.label} · ${RESP[p.resp]} · ${p.radius || cfg().radius} m · done by ${n}/${S.teams.length}</small></div><b class="num">${p.value}</b></div>`; }).join("")
    : `<div class="empty"><b>No points yet</b>Select your hunt area first, then add points by tapping the map.</div>`);
  const c = cfg();
  patch(ensure(body, "pp-fin", `<div id="pp-fin"></div>`), `<div class="item"><div class="numpin" style="background:${BRAND}"><span>⚑</span></div><div class="main"><b>Finish</b><small>${c.finish ? "Revealed with a compass once a team has done every task" : "Not set yet — use “Set finish” on the map"}</small></div><button class="btn sm" data-act="mode" data-mode="finish">${c.finish ? "Move" : "Set"}</button></div>`);
}
function openPointEditor(id, at) {
  const p = id ? S.points.find(x => x.id === id) : null; if (id && !p) return;
  const kind = p ? p.kind : "question";
  const lat = p ? p.lat : at.lat, lng = p ? p.lng : at.lng;
  openSheet(`<div class="sheet-h"><div class="t"><div class="eyebrow">${p ? "Point " + p.n : "New point"}</div><h2>${p ? "Edit point" : "Add a point"}</h2></div><button class="btn ghost sm" data-close>Close</button></div>
  <form class="form" id="pf">
    <div class="seg" role="radiogroup" aria-label="Type">${Object.entries(KINDS).map(([k, v]) => `<label style="--c:${v.c}"><input type="radio" name="kind" value="${k}"${k === kind ? " checked" : ""}><i class="dot" style="background:${v.c}"></i>${v.label}</label>`).join("")}</div>
    <label>Title (visible on the map)<input id="pf-title" maxlength="80" required value="${esc(p ? p.title : "")}" placeholder="e.g. The bull on the square" autofocus></label>
    <label>Instructions (shown once the team is there)<textarea id="pf-prompt" rows="4" placeholder="What should the team answer or do here?">${esc(p ? p.prompt : "")}</textarea></label>
    <div class="row2"><label>Teams respond with<select id="pf-resp">${Object.entries(RESP).map(([k, v]) => `<option value="${k}"${(p ? p.resp : "text") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Points<input id="pf-val" type="number" min="0" max="1000" step="1" value="${p ? p.value : KINDS[kind].def}"></label></div>
    <label id="pf-expwrap">Correct answer (optional)<input id="pf-expect" value="${esc(p ? p.expect : "")}" placeholder="e.g. 1824 | eighteen twenty-four"><small>Matching answers are approved automatically. Separate alternatives with |. Leave empty to check by hand.</small></label>
    <div class="row2"><label>Unlock radius (m)<input id="pf-rad" type="number" min="5" max="500" step="1" value="${p && p.radius ? p.radius : ""}" placeholder="${cfg().radius || 15}"></label>
    <label>Location<input id="pf-coord" value="${lat.toFixed(6)}, ${lng.toFixed(6)}" inputmode="decimal"></label></div>
    <small class="hint">Leave the radius empty to use the default. Paste coordinates from Google Maps for an exact spot, or drag the pin on the map.</small>
    <div class="actions">${p ? `<button type="button" class="btn danger" id="pf-del">Delete</button>` : ""}<span class="spacer"></span><button class="btn primary">${p ? "Save" : "Add point"}</button></div>
  </form>`, sh => {
    $("[data-close]", sh).onclick = closeSheet;
    const expW = $("#pf-expwrap", sh), val = $("#pf-val", sh);
    const sync = () => { expW.hidden = $("input[name=kind]:checked", sh).value !== "question"; };
    $$("input[name=kind]", sh).forEach(r => r.onchange = () => { sync(); if (!p) val.value = KINDS[r.value].def; }); sync();
    if (p) $("#pf-del", sh).onclick = async e => { if (!armed(e.currentTarget, "Tap again to delete")) return; closeSheet(); act({id:p.id}, "point_delete", "Point deleted"); };
    $("#pf", sh).onsubmit = async e => {
      e.preventDefault();
      const m = $("#pf-coord", sh).value.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
      if (!m) return toast("Enter the location as latitude, longitude — for example 52.3389, 4.8721");
      const k = $("input[name=kind]:checked", sh).value;
      const data = {id:p ? p.id : "", kind:k, title:$("#pf-title", sh).value.trim(), prompt:$("#pf-prompt", sh).value.trim(), resp:$("#pf-resp", sh).value,
        value:Math.max(0, Math.round(+val.value || 0)), expect:k === "question" ? $("#pf-expect", sh).value.trim() : "", lat:+m[1], lng:+m[2], radius:$("#pf-rad", sh).value.trim()};
      if (!data.title) return toast("Give the point a title.");
      const r = await act(data, "point_save", p ? "Point saved" : "Point added"); if (r.ok) closeSheet();
    };
  });
}

function panelTeams(body) {
  const f = ensure(body, "tt-new", `<form id="tt-new" class="card"><h3>New team</h3><div class="chatform"><input id="tt-name" placeholder="Team name" maxlength="40"><button class="btn primary">Create</button></div><small class="hint">Each team gets a login code. Teams can change their name and add members after logging in.</small></form>`);
  if (!f._b) { f._b = true; f.onsubmit = async e => { e.preventDefault(); const i = $("#tt-name"); const r = await act({name:i.value.trim()}, "team_save", r => `Team created — code ${r.code}`); if (r.ok) i.value = ""; }; }
  const w = teamById(cfg().winner_id);
  patch(ensure(body, "tt-win", `<div id="tt-win"></div>`), status() === "ended" && w ? `<div class="winner"><span class="eyebrow" style="color:inherit">Winner</span><b>${esc(w.name)}</b><span class="num">${w.score} points</span></div>` : "");
  const total = S.points.length;
  patch(ensure(body, "tt-list", `<div id="tt-list" class="list"></div>`), S.teams.length ? ranking().map((r, i) => { const t = r.t; const lastSub = Math.max(0, ...S.subs.filter(s => s.team_id === t.id).map(s => T(s.at)));
    const bon = S.bonuses.find(b => b.claim_team === t.id);
    const pn = id => { const p = S.points.find(x => x.id === id); return p ? `#${p.n} ${esc(p.title)}` : "–"; };
    return `<div class="card teamrow"><div class="top"><span class="rank">${i + 1}</span><b>${esc(t.name)}</b><span class="num" style="font-family:var(--f-display);font-weight:800;font-size:18px">${r.score}</span></div>
      <div class="bar"><i style="width:${total ? r.done / total * 100 : 0}%"></i></div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12.5px" class="muted"><span class="num">${r.done}/${total} tasks</span>·<span>${lastSub ? "last answer " + ago(lastSub) : "no answers yet"}</span>${t.last_seen ? `·<span>seen ${ago(t.last_seen)}</span>` : ""}${bon ? `·<span style="color:var(--warn);font-weight:700">doing bonus “${esc(bon.title)}”</span>` : ""}${t.all_done ? `·<span style="color:var(--ok);font-weight:700">all done</span>` : ""}</div>
      <div style="font-size:13px">Start: <b>${pn(t.start_eff)}</b>${t.start_point ? "" : ' <span class="muted">(auto)</span>'}${!t.all_done && t.next_point ? ` · Next: <b>${bon ? "bonus first" : pn(t.next_point)}</b>` : ""}</div>
      ${t.members && t.members.length ? `<div style="font-size:13px">${t.members.map(esc).join(", ")}</div>` : ""}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="codepill" data-act="copy" data-text="${esc(t.code)}" title="Copy code">${esc(t.code)}</span><span style="flex:1"></span><button class="btn sm" data-act="chat-team" data-id="${t.id}">${I.chat} Chat</button><button class="btn sm" data-act="edit-team" data-id="${t.id}">Edit</button></div></div>`; }).join("")
    : `<div class="empty"><b>No teams yet</b>Create a team above and hand out its code.</div>`);
}
function openTeamEditor(id) {
  const t = teamById(id); if (!t) return;
  const bon = S.bonuses.find(b => b.claim_team === id);
  const nxt = S.points.find(p => p.id === t.next_point);
  const target = bon ? (bon.claim_unlocked ? null : {bonus_id:bon.id, label:`Bonus: ${esc(bon.title)}`}) : nxt && !isUnlocked(id, nxt.id) ? {point_id:nxt.id, label:`#${nxt.n} ${esc(nxt.title)}`} : null;
  openSheet(`<div class="sheet-h"><div class="t"><div class="eyebrow">Team</div><h2>${esc(t.name)}</h2></div><button class="btn ghost sm" data-close>Close</button></div>
  <form class="form" id="te"><label>Team name<input id="te-name" maxlength="40" value="${esc(t.name)}"></label>
  <label>Members<textarea id="te-mem" rows="4" placeholder="One name per line">${esc((t.members || []).join("\n"))}</textarea></label>
  <label>Start point<select id="te-start"><option value="">Automatic (spread over the points)</option>${S.points.map(p => `<option value="${p.id}"${t.start_point === p.id ? " selected" : ""}>#${p.n} ${esc(p.title)}</option>`).join("")}</select><small>From there the team follows the point numbers in order, wrapping round to #1.</small></label>
  <div class="item"><div class="main"><b class="mono">${esc(t.code)}</b><small>Login code</small></div><span></span><button type="button" class="btn sm" id="te-code">New code</button></div>
  <div class="actions"><button type="button" class="btn danger" id="te-del">Delete team</button><span class="spacer"></span><button class="btn primary">Save</button></div></form>
  <div class="card"><h3>Unlock by hand</h3><p class="hint" style="margin:0">For when the team is at the spot but their GPS won't cooperate.</p>
  ${target ? `<div class="item"><div class="main"><b>${target.label}</b><small>${bon ? "Claimed bonus task" : "This team's next stop"}</small></div><span></span><button type="button" class="btn" id="te-unl">Unlock</button></div>` : `<p class="hint" style="margin:0">Nothing to unlock right now.</p>`}</div>`, sh => {
    $("[data-close]", sh).onclick = closeSheet;
    const u = $("#te-unl", sh); if (u) u.onclick = async () => { const r = await act({team_id:id, point_id:target.point_id || "", bonus_id:target.bonus_id || ""}, "unlock", "Unlocked for " + t.name); if (r.ok) closeSheet(); };
    $("#te-code", sh).onclick = async e => { if (!armed(e.currentTarget, "Tap again — old code stops working")) return; const r = await act({id}, "team_newcode", r => "New code: " + r.code); if (r.ok) closeSheet(); };
    $("#te-del", sh).onclick = async e => { if (!armed(e.currentTarget, "Tap again to delete team")) return; closeSheet(); act({id}, "team_delete", "Team deleted"); };
    $("#te", sh).onsubmit = async e => { e.preventDefault(); const name = $("#te-name", sh).value.trim(); if (!name) return; const members = $("#te-mem", sh).value.split("\n").map(s => s.trim()).filter(Boolean);
      const r = await act({id, name, members, start_point:$("#te-start", sh).value}, "team_save", "Team saved"); if (r.ok) closeSheet(); };
  });
}

function targetInfo(s) {
  if (s.target === "bonus") { const b = S.bonuses.find(x => x.id === s.target_id); return {label:"Bonus", color:GOLD, ink:"#2A2200", title:b ? b.title : "(deleted bonus)", value:b ? b.value : 0, n:"★", expect:b ? b.expect : ""}; }
  const p = S.points.find(x => x.id === s.target_id); const k = KINDS[p ? p.kind : "question"];
  return {label:k.label, color:k.c, ink:"#fff", title:p ? p.title : "(deleted point)", value:p ? p.value : 0, n:p ? p.n : "?", expect:p ? p.expect : ""};
}
function panelReview(body) {
  const tg = ensure(body, "rv-head", `<div id="rv-head" style="display:flex;gap:8px;align-items:center"><h3 style="flex:1;font-size:18px">Review</h3><label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="rv-all"> Show checked</label></div>`);
  const cb = $("#rv-all", tg); if (!cb._b) { cb._b = true; cb.checked = ui.showAll; cb.onchange = () => { ui.showAll = cb.checked; renderAdminPanel(); }; }
  const subs = S.subs.filter(s => ui.showAll || s.status === "review").sort((a, b) => (a.status === "review" ? 0 : 1) - (b.status === "review" ? 0 : 1) || T(b.at) - T(a.at));
  patch(ensure(body, "rv-list", `<div id="rv-list" class="list"></div>`), subs.length ? subs.map(s => { const t = teamById(s.team_id); const ti = targetInfo(s);
    const stTxt = s.status === "ok" ? `<span class="chip" style="color:var(--ok)">Approved · ${s.awarded}</span>` : s.status === "rejected" ? `<span class="chip" style="color:var(--bad)">Rejected</span>` : `<span class="chip" style="color:var(--warn)">To check</span>`;
    return `<div class="sub"><div class="hd"><div class="numpin" style="background:${ti.color};color:${ti.ink};width:24px;height:24px;font-size:11px"><span>${ti.n}</span></div><b style="flex:1;min-width:0">${esc(ti.title)}</b>${stTxt}</div>
      <div class="muted" style="font-size:12.5px">${esc(t ? t.name : "Deleted team")} · ${ti.label} · ${ago(s.at)}${ti.expect ? ` · expected: <b>${esc(ti.expect)}</b>` : ""}</div>
      ${s.body ? `<div class="ans">${esc(s.body)}</div>` : ""}${photoTag(s.photo, 140)}
      <div class="ctl"><input type="number" min="0" step="1" value="${s.status === "ok" ? s.awarded : ti.value}" aria-label="Points to award" id="aw-${s.id}"><button class="btn sm primary" data-act="rv-ok" data-id="${s.id}">Approve</button><button class="btn sm danger" data-act="rv-no" data-id="${s.id}">Reject</button></div></div>`; }).join("")
    : `<div class="empty"><b>Nothing to check</b>Answers and photos from teams appear here as they come in.</div>`);
}
function rejectSub(id) {
  openSheet(`<div class="sheet-h"><div class="t"><h2>Reject this answer</h2></div><button class="btn ghost sm" data-close>Close</button></div>
    <form class="form" id="rj"><label>Note for the team (optional)<input id="rj-n" maxlength="200" placeholder="e.g. The photo needs the whole team in it" autofocus></label><small class="hint">The team sees the note and can try again.</small><div class="actions"><button class="btn danger">Reject</button></div></form>`, sh => {
    $("[data-close]", sh).onclick = closeSheet;
    $("#rj", sh).onsubmit = async e => { e.preventDefault(); const r = await act({id, status:"rejected", note:$("#rj-n", sh).value.trim()}, "review", "Answer rejected"); if (r.ok) closeSheet(); };
  });
}

function panelChat(body) {
  if (!ui.chatTeam || !teamById(ui.chatTeam)) ui.chatTeam = S.teams[0] ? S.teams[0].id : null;
  if (!S.teams.length) { patch(ensure(body, "ch-empty", `<div id="ch-empty"></div>`), `<div class="empty"><b>No teams yet</b>Create teams first, then you can chat with each of them here.</div>`); return; }
  const em = $("#ch-empty", body); if (em) em.remove();
  const wrap = ensure(body, "ch-wrap", `<div id="ch-wrap" class="chatsplit"><div class="chatteams" id="ch-teams"></div><div class="chat"><div class="msgs" id="ch-msgs" style="max-height:calc(100vh - 300px)"></div><form class="chatform" id="ch-f"><input id="ch-in" placeholder="Message to team" maxlength="1000" autocomplete="off"><button class="btn primary">Send</button></form></div></div>`);
  patch($("#ch-teams", wrap), S.teams.map(t => { const u = unreadFor(t.id, "admin"); return `<button class="${t.id === ui.chatTeam ? "on" : ""}" data-act="chat-team" data-id="${t.id}"><span class="n">${esc(t.name)}</span>${u ? `<span class="badge">${u}</span>` : ""}</button>`; }).join(""));
  const box = $("#ch-msgs", wrap); const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  patch(box, chatHTML(ui.chatTeam, "admin")); if (atEnd || box._team !== ui.chatTeam) box.scrollTop = box.scrollHeight; box._team = ui.chatTeam;
  markRead(ui.chatTeam, "admin");
  const f = $("#ch-f", wrap); if (!f._b) { f._b = true; f.onsubmit = async e => { e.preventDefault(); const i = $("#ch-in"); const v = i.value; i.value = ""; if (!(await sendMsg(ui.chatTeam, v))) i.value = v; }; }
}

function panelBonus(body) {
  ensure(body, "bn-head", `<div id="bn-head" style="display:grid;gap:8px"><div style="display:flex;gap:8px;align-items:center"><h3 style="flex:1;font-size:18px">Bonus tasks</h3><button class="btn primary sm" data-act="mode" data-mode="bonus">+ Add bonus</button></div><p class="hint" style="margin:0">A bonus task has its own spot on the map. When you offer it, it pops up as a gold pin for every team that hasn't done it yet. The first team to claim it makes it disappear for the others, and that team must finish it before its next stop appears. Once that team has handed it in, the bonus closes. Offer it again for a new round; each team can do it once. Drag a gold pin to move it.</p></div>`);
  patch(ensure(body, "bn-list", `<div id="bn-list" class="list"></div>`), S.bonuses.length ? S.bonuses.map(b => { const ct = b.claim_team && teamById(b.claim_team);
    const doneN = (b.done_by || []).length, left = S.teams.length - doneN;
    const state = b.lat == null ? `<span class="chip" style="color:var(--bad)">No location</span>` : !b.released ? `<span class="chip">${doneN ? (left > 0 ? "Closed" : "Done by every team") : "Not offered yet"}</span>` : ct ? `<span class="chip" style="color:var(--warn)">${esc(ct.name)} is on it</span>` : `<span class="chip" style="color:var(--ok)">Open to claim</span>`;
    return `<div class="card"><div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1;min-width:0"><b style="font-family:var(--f-display);font-size:16px">${esc(b.title)}</b><div class="muted" style="font-size:12.5px">+${b.value} pts · ${RESP[b.resp]} · done by ${doneN}/${S.teams.length} teams${doneN ? ": " + b.done_by.map(id => esc((teamById(id) || {}).name || "?")).join(", ") : ""}</div></div>${state}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${b.released ? `<button class="btn sm" data-act="bonus-rel" data-id="${b.id}" data-v="0">Hide</button>` : (left > 0 || !S.teams.length ? `<button class="btn sm gold" data-act="bonus-rel" data-id="${b.id}" data-v="1">${I.star} ${doneN ? "Offer again" : "Offer now"}</button>` : "")}${ct ? `<button class="btn sm" data-act="bonus-free" data-id="${b.id}">Take it back</button>` : ""}<span style="flex:1"></span><button class="btn sm" data-act="bonus-edit" data-id="${b.id}">Edit</button></div></div>`; }).join("")
    : `<div class="empty"><b>No bonus tasks yet</b>Create one now and release it during the hunt to shake things up.</div>`);
}
function openBonusEditor(id, at) {
  const b = id ? S.bonuses.find(x => x.id === id) : null;
  const ll = b && b.lat != null ? {lat:b.lat, lng:b.lng} : at || null;
  openSheet(`<div class="sheet-h"><div class="t"><div class="eyebrow">Bonus task</div><h2>${b ? "Edit bonus" : "New bonus"}</h2></div><button class="btn ghost sm" data-close>Close</button></div>
    <form class="form" id="be"><label>Title (visible on the map)<input id="be-t" maxlength="80" required value="${esc(b ? b.title : "")}" placeholder="e.g. Human pyramid" autofocus></label>
    <label>Instructions (shown once the team is there)<textarea id="be-p" rows="4" placeholder="What should the team do here?">${esc(b ? b.prompt : "")}</textarea></label>
    <div class="row2"><label>Teams respond with<select id="be-r">${Object.entries(RESP).map(([k, v]) => `<option value="${k}"${(b ? b.resp : "photo") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label><label>Points<input id="be-v" type="number" min="0" step="1" value="${b ? b.value : 25}"></label></div>
    <label id="be-expwrap">Correct answer (optional)<input id="be-expect" value="${esc(b ? b.expect || "" : "")}" placeholder="e.g. 1824 | eighteen twenty-four"><small>A matching answer earns the points straight away. Separate alternatives with |. Leave empty to check by hand in Review.</small></label>
    <div class="row2"><label>Unlock radius (m)<input id="be-rad" type="number" min="5" max="500" step="1" value="${b && b.radius ? b.radius : ""}" placeholder="${cfg().radius || 15}"></label>
    <label>Location<input id="be-coord" value="${ll ? ll.lat.toFixed(6) + ", " + ll.lng.toFixed(6) : ""}" placeholder="52.3389, 4.8721" inputmode="decimal"></label></div>
    <div class="actions">${b ? `<button type="button" class="btn danger" id="be-del">Delete</button>` : ""}<span class="spacer"></span><button class="btn primary">${b ? "Save" : "Create"}</button></div></form>`, sh => {
    $("[data-close]", sh).onclick = closeSheet;
    const syncExp = () => { $("#be-expwrap", sh).hidden = $("#be-r", sh).value === "photo"; };
    $("#be-r", sh).onchange = syncExp; syncExp();
    if (b) $("#be-del", sh).onclick = e => { if (!armed(e.currentTarget, "Tap again to delete")) return; closeSheet(); act({id:b.id}, "bonus_delete", "Bonus deleted"); };
    $("#be", sh).onsubmit = async e => { e.preventDefault();
      const m = $("#be-coord", sh).value.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
      if (!m) return toast("Enter the location as latitude, longitude — or use “Add bonus” and tap the map.");
      const data = {id:b ? b.id : "", title:$("#be-t", sh).value.trim(), prompt:$("#be-p", sh).value.trim(), resp:$("#be-r", sh).value, value:Math.max(0, Math.round(+$("#be-v", sh).value || 0)), expect:$("#be-r", sh).value === "photo" ? "" : $("#be-expect", sh).value.trim(), lat:+m[1], lng:+m[2], radius:$("#be-rad", sh).value.trim()};
      if (!data.title) return; const r = await act(data, "bonus_save", b ? "Bonus saved" : "Bonus created — release it when you're ready"); if (r.ok) closeSheet(); };
  });
}

function panelSettings(body) {
  const c = cfg();
  const f = ensure(body, "st-f", `<form id="st-f" class="card form"><h3>Hunt</h3>
    <label>Name of the hunt<input id="st-title" maxlength="60"></label>
    <label>Default unlock radius (m)<input id="st-rad" type="number" min="5" max="500" step="1"><small>How close a team must be to open a task. Points can override this.</small></label>
    <h3 style="margin-top:6px">Finish</h3>
    <label>Finish title<input id="st-ft" maxlength="60"></label>
    <label>Message at the finish<textarea id="st-fx" rows="3"></textarea></label>
    <div class="actions"><button type="button" class="btn" data-act="mode" data-mode="finish">Place finish on map</button><button class="btn primary">Save</button></div></form>`);
  if (!f._b) { f._b = true; $("#st-title").value = c.title || ""; $("#st-rad").value = c.radius || 15; $("#st-ft").value = c.finish_title || ""; $("#st-fx").value = c.finish_text || "";
    f.onsubmit = e => { e.preventDefault(); act({title:$("#st-title").value.trim(), radius:Math.round(+$("#st-rad").value || 15), finish_title:$("#st-ft").value.trim(), finish_text:$("#st-fx").value.trim()}, "config", "Settings saved"); }; }
  const a = ensure(body, "st-adm", `<form id="st-adm" class="card form"><h3>Organiser code</h3><p class="hint" style="margin:0">The code you log in with as organiser. Keep it to yourself.</p><div class="chatform"><input id="st-code" placeholder="New organiser code" maxlength="24" autocomplete="off"><button class="btn">Change</button></div></form>`);
  if (!a._b) { a._b = true; a.onsubmit = async e => { e.preventDefault(); const v = $("#st-code").value.trim(); const r = await act({code:v}, "admin_code", "Organiser code changed"); if (r.ok) { saveSession({...session, code:v}); $("#st-code").value = ""; } }; }
  const z = ensure(body, "st-reset", `<div id="st-reset" class="card"><h3>Test run finished?</h3><p class="hint" style="margin:0">Clear all answers, unlocks, chat messages and bonus claims. Teams, points and bonus tasks stay. The hunt goes back to “Not started”.</p><div class="actions"><button class="btn danger" id="st-rst">Clear all progress</button></div></div>`);
  const rb = $("#st-rst", z); if (!rb._b) { rb._b = true; rb.onclick = () => { if (!armed(rb, "Tap again — this can't be undone")) return; act({}, "reset", "All progress cleared"); }; }
}

/* ---------- global actions ---------- */
document.addEventListener("click", async e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  const map = ui.screen === "admin" ? amap : tmap;
  switch (a) {
    case "zin": map.zoomIn(); break;
    case "zout": map.zoomOut(); break;
    case "zfit": fitArea(map); break;
    case "locate": if (!geoFresh()) { toast(geo.err === "denied" ? "Location is blocked. Allow it in your browser settings." : "Still finding your location…"); break; } ui.follow = true; el.classList.add("on"); tmap.setView([geo.lat, geo.lng], Math.max(tmap.getZoom(), 17)); break;
    case "info": openInfo(); break;
    case "t-chat": openTeamChat(); break;
    case "t-team": openTeamDetails(); break;
    case "t-bonus": openBonus(id); break;
    case "t-compass": openCompass(); break;
    case "a-logout": if (armed(el, "Log out?")) { saveSession(null); S = null; lastJSON = ""; render(true); } break;
    case "a-start": if (!S.points.length) { toast("Add at least one point before starting."); break; } act({}, "start", "The hunt is live!"); break;
    case "a-end": if (!armed(el, "Confirm: end hunt")) break; ui.tab = "teams"; act({}, "end", "Hunt ended — winner picked"); break;
    case "a-reopen": act({}, "reopen", "Hunt reopened"); break;
    case "tab": ui.tab = el.dataset.tab; renderAdminPanel(true); break;
    case "mode": setMode(el.dataset.mode); if (el.dataset.mode === "area" && !cfg().bbox) amap.setView([52.2, 5.3], 7); break;
    case "edit-point": openPointEditor(id); break;
    case "edit-team": openTeamEditor(id); break;
    case "chat-team": ui.chatTeam = id; ui.tab = "chat"; renderAdminPanel(true); break;
    case "copy": copyText(el.dataset.text); break;
    case "rv-ok": { const v = Math.max(0, Math.round(+(($("#aw-" + id) || {}).value) || 0)); act({id, status:"ok", awarded:v}, "review", `Approved · +${v}`); } break;
    case "rv-no": rejectSub(id); break;
    case "bonus-edit": openBonusEditor(id); break;
    case "bonus-rel": act({id, released:el.dataset.v === "1"}, "bonus_release", el.dataset.v === "1" ? "Bonus offered to the teams that haven't done it" : "Bonus hidden"); break;
    case "bonus-free": act({id}, "bonus_free", "Bonus is open to all teams again"); break;
  }
});

/* ---------- render ---------- */
function render(force) {
  if (!session) { if (ui.screen !== "login" || force) { closeSheet(); renderLogin(); } return; }
  if (!S) { if (force) { app.innerHTML = `<div class="loading">Loading the trail…</div>`; ui.screen = null; } return; }
  const want = S.role;
  if (ui.screen !== want || force) { closeSheet(); tmap && tmap.remove(); amap && amap.remove(); tmap = amap = null; tMarkKey = aMarkKey = ""; want === "admin" ? renderAdminShell() : renderTeamShell(); }
  want === "admin" ? updateAdmin() : updateTeam();
}

render(true);
if (session) refresh();
})();
