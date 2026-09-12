const API_URL = "https://script.google.com/macros/s/AKfycbwdbAHWKbaIPpSyxV0XNuKzjHUiEdY7XsjPz_MPBgMw7LEAxO9iSlQrun3IwW_TYYFl/exec";

const USERS = {
  entry: { password: "entry123", role: "entry" },
  analysis: { password: "analysis123", role: "analysis" },
  admin: { password: "admin123", role: "admin" }
};

const CACHE_KEY = "jsdg_google_sheet_cache_v1";
const CACHE_TIME_KEY = "jsdg_google_sheet_cache_time_v1";

function clean(v) { return String(v ?? "").trim(); }
function esc(v) {
  return clean(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentUser() {
  try { return JSON.parse(sessionStorage.getItem("jsdg_user") || "null"); }
  catch (e) { return null; }
}

function logout() {
  sessionStorage.removeItem("jsdg_user");
  location.href = "index.html";
}

function requireRole(allowed) {
  const u = currentUser();
  if (!u || !allowed.includes(u.role)) {
    location.href = "index.html";
    return null;
  }
  const el = document.getElementById("currentUser");
  if (el) el.textContent = `${u.username} (${u.role})`;
  return u;
}

function closed(s) {
  return /(closed|complete|completed|rectified|done|ok|fit|working|resolved)/i.test(clean(s));
}

function countBy(data, i, label = "Not Specified") {
  const out = {};
  data.forEach(row => {
    const key = clean(row[i]) || label;
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function topN(obj, n) {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n));
}

function getCachedData() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); }
  catch (e) { return []; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
  } catch (e) {
    console.warn("Cache save failed", e);
  }
}

function getCacheAgeText() {
  const t = Number(localStorage.getItem(CACHE_TIME_KEY) || 0);
  if (!t) return "";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "updated just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `updated ${min} min ago`;
  const hr = Math.floor(min / 60);
  return `updated ${hr} hr ago`;
}

async function fetchGoogleData() {
  const url = `${API_URL}?action=getData&t=${Date.now()}`;
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheet connection failed (HTTP ${response.status})`);
  const result = await response.json();
  if (!result.success) throw new Error(result.message || "Unable to load Google Sheet data");
  const data = result.data || [];
  saveCache(data);
  return data;
}

async function apiGetData(forceGoogle = false) {
  if (!forceGoogle) {
    const cached = getCachedData();
    if (cached.length) return cached;
  }
  return fetchGoogleData();
}

async function apiRefreshData() {
  try { return await fetchGoogleData(); }
  catch (e) {
    console.warn("Background refresh failed", e);
    return null;
  }
}

async function apiSaveRecord(record, rowNumber = null) {
  const payload = rowNumber
    ? { action: "update", rowNumber: Number(rowNumber), record }
    : { action: "add", record };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Save failed (HTTP ${response.status})`);
  const result = await response.json();
  if (!result.success) throw new Error(result.message || "Record could not be saved");
  await fetchGoogleData();
  return result;
}

async function apiDeleteRecord(rowNumber) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "delete", rowNumber: Number(rowNumber) })
  });

  if (!response.ok) throw new Error(`Delete failed (HTTP ${response.status})`);
  const result = await response.json();
  if (!result.success) throw new Error(result.message || "Record could not be deleted");
  await fetchGoogleData();
  return result;
}

function drawChart(id, obj, palette, clickCallback = null) {
  const c = document.getElementById(id);
  if (!c) return;

  const box = c.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.max(300, box.width) * dpr;
  c.height = Math.max(170, box.height) * dpr;

  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = c.width / dpr;
  const H = c.height / dpr;
  ctx.clearRect(0, 0, W, H);

  const entries = Object.entries(obj);
  if (!entries.length) {
    ctx.fillStyle = "#748188";
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("No data", W / 2, H / 2);
    c.onclick = null;
    c.style.cursor = "default";
    return;
  }

  const p = { l: 40, r: 12, t: 15, b: 62 };
  const cw = W - p.l - p.r;
  const ch = H - p.t - p.b;
  const max = Math.max(...entries.map(e => e[1]), 1);

  ctx.strokeStyle = "#e3e9ec";
  ctx.fillStyle = "#65737a";
  ctx.font = "9px Arial";
  for (let i = 0; i <= 5; i++) {
    const y = p.t + ch - (ch * i / 5);
    ctx.beginPath();
    ctx.moveTo(p.l, y);
    ctx.lineTo(W - p.r, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(Math.round(max * i / 5), p.l - 5, y + 3);
  }

  const slot = cw / entries.length;
  const bw = Math.min(54, slot * 0.62);
  const bars = [];

  entries.forEach(([label, value], i) => {
    const x = p.l + slot * i + (slot - bw) / 2;
    const h = (value / max) * ch;
    const y = p.t + ch - h;

    ctx.fillStyle = palette[i % palette.length];
    ctx.fillRect(x, y, bw, h);

    bars.push({ label, x, y, width: bw, height: h });

    ctx.fillStyle = "#24343c";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(value, x + bw / 2, Math.max(10, y - 3));

    ctx.save();
    ctx.translate(x + bw / 2, p.t + ch + 8);
    ctx.rotate(-Math.PI / 5);
    ctx.fillStyle = "#617078";
    ctx.font = "9px Arial";
    ctx.textAlign = "right";
    ctx.fillText(label.length > 18 ? `${label.slice(0, 17)}…` : label, 0, 0);
    ctx.restore();
  });

  c.style.cursor = clickCallback ? "pointer" : "default";
  c.onclick = clickCallback ? function (event) {
    const rect = c.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    const mx = (event.clientX - rect.left) * sx;
    const my = (event.clientY - rect.top) * sy;
    const bar = bars.find(b => mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + b.height);
    if (bar) clickCallback(bar.label);
  } : null;
}
