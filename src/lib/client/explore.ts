// PROTOTYPE client for variant D, "Drill down". One loop, kept simple:
// - tap a show: go deeper (a normal link; the shell morphs its poster into the next hero);
// - hold a show: its top matches fan out, slide onto one and let go to jump there;
// - "Path map": the shows you went through, in order, with a few roads not taken around each.
import gsap from "gsap";
import { morphTo } from "./shell";
import { esc, IMG, pageHref, type Branch, type M } from "../explore";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = (s: number) => (reduce ? 0 : s);

type Step = { id?: string; slug: string; name: string; poster: string };
function readPath(): Step[] {
  try { return JSON.parse(sessionStorage.getItem("slm:trail") ?? "[]"); } catch { return []; }
}

// ---------- data ----------
const cache = new Map<string, Promise<Branch>>();
function load(id: string): Promise<Branch> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/prototype/m/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

const posterHtml = (m: { poster: string | null; name: string }, size = "w185", cls = "poster") =>
  m.poster ? `<img class="${cls}" src="${IMG}${size}${m.poster}" alt="" draggable="false">` : `<span class="poster-ph">${esc(m.name)}</span>`;

// ---------- peek fan ----------
let fan: HTMLElement;
let press: { card: HTMLElement; x: number; y: number; timer: number } | null = null;
let fanOpen = false;
let holding = false; // the finger that opened the fan is still down
let suppressClick = false;
let hot: HTMLElement | null = null;

function endPress() {
  if (press) {
    clearTimeout(press.timer);
    press.card.classList.remove("pressing");
  }
  press = null;
  if (!fanOpen) document.documentElement.classList.remove("holding");
}

async function openFan(card: HTMLElement) {
  card.classList.remove("pressing");
  press = null;
  fanOpen = holding = suppressClick = true;
  navigator.vibrate?.(12);

  const seen = new Set([...readPath().map((s) => s.id), card.dataset.hop]);
  let data: Branch;
  try { data = await load(card.dataset.hop!); } catch { return closeFan(); }
  if (!fanOpen) return;
  const top = data.matches.filter((m) => !seen.has(String(m.id))).slice(0, 5);

  const a = card.querySelector(".art")!.getBoundingClientRect();
  fan.innerHTML = `<p class="fan-title">Like <b>${esc(card.dataset.name!)}</b> · slide onto one, or tap</p>`
    + posterHtml({ poster: card.dataset.poster || null, name: card.dataset.name! }, "w185", "poster fan-lift")
    + top.map((m) => `<a class="fan-card" href="${pageHref(m.slug)}"><span class="pic">${posterHtml(m)}`
      + (m.rating ? `<span class="rate">★ ${m.rating.toFixed(1)}</span>` : "")
      + `</span><span class="name">${esc(m.name)}</span></a>`).join("");
  fan.hidden = false;
  const lift = fan.querySelector<HTMLElement>(".fan-lift");
  if (lift) Object.assign(lift.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px` });

  // An arc above the held card (below it when the card is high up), centred so it always fits on screen.
  const cx = a.left + a.width / 2, cy = a.top + a.height / 2;
  const up = cy > innerHeight * 0.45 ? -1 : 1;
  const R = Math.min(170, innerWidth * 0.4);
  const ax = Math.max(R + 40, Math.min(innerWidth - R - 40, cx));
  const spread = Math.PI / 3.2;
  gsap.fromTo(fan, { opacity: 0 }, { opacity: 1, duration: dur(0.18) });
  fan.querySelectorAll<HTMLElement>(".fan-card").forEach((el, i) => {
    const t = top.length > 1 ? -spread + (2 * spread * i) / (top.length - 1) : 0;
    const x = ax + R * Math.sin(t);
    const y = Math.max(110, Math.min(innerHeight - 140, cy + up * R * Math.cos(t)));
    gsap.fromTo(el,
      { x: cx, y: cy, xPercent: -50, yPercent: -50, scale: 0.3, rotation: 0, opacity: 0 },
      { x, y, scale: 1, rotation: (t * 180 / Math.PI) * 0.3 * -up, opacity: 1, duration: dur(0.38), delay: dur(i * 0.03), ease: "back.out(1.7)" });
  });
}

/** The fan card nearest the finger (within reach) is the one you'd land on. */
function aim(x: number, y: number) {
  let best: HTMLElement | null = null, bestD = 70;
  for (const el of fan.querySelectorAll<HTMLElement>(".fan-card")) {
    const r = el.querySelector(".pic")!.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
    if (d < bestD) { best = el; bestD = d; }
  }
  if (best !== hot) {
    hot?.classList.remove("hot");
    hot = best;
    if (hot) { hot.classList.add("hot"); navigator.vibrate?.(6); }
  }
}

function closeFan() {
  fanOpen = holding = false;
  hot = null;
  document.documentElement.classList.remove("holding");
  gsap.to(fan, { opacity: 0, duration: dur(0.15), onComplete: () => { fan.hidden = true; fan.innerHTML = ""; } });
}

function goFromFan(card: HTMLElement) {
  morphTo(card.querySelector(".poster"), "none");
  location.href = card.getAttribute("href")!;
}

function initFan(rows: HTMLElement) {
  fan = document.getElementById("fan")!;
  rows.addEventListener("pointerdown", (e) => {
    suppressClick = false;
    const card = (e.target as Element).closest<HTMLElement>(".card[data-hop]");
    if (!card || e.button > 0) return;
    load(card.dataset.hop!).catch(() => {}); // warm the cache so the fan opens with its data ready
    document.documentElement.classList.add("holding");
    card.classList.add("pressing");
    press = { card, x: e.clientX, y: e.clientY, timer: window.setTimeout(() => openFan(card), 380) };
  });
  addEventListener("pointermove", (e) => {
    if (fanOpen && holding) aim(e.clientX, e.clientY);
    else if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) endPress();
  });
  addEventListener("pointerup", () => {
    endPress();
    if (!fanOpen || !holding) return;
    holding = false;
    if (hot) goFromFan(hot);
    // Let go on nothing: the fan stays open for a tap.
  });
  addEventListener("pointercancel", () => { endPress(); holding = false; });
  // While a show is held, the finger steers the fan: no scrolling, no long-press menu, no text selection.
  document.addEventListener("touchmove", (e) => { if (fanOpen && holding) e.preventDefault(); }, { passive: false });
  document.addEventListener("contextmenu", (e) => {
    if (press || fanOpen || (e.target as Element).closest?.(".ex .card, .ex .fan")) e.preventDefault();
  });
  rows.addEventListener("click", (e) => {
    if (!suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick = false;
  }, { capture: true });
  fan.addEventListener("click", (e) => {
    e.preventDefault();
    if (holding) return;
    const c = (e.target as Element).closest<HTMLElement>(".fan-card");
    if (c) goFromFan(c);
    else closeFan();
  });
}

// ---------- path map ----------
let map: HTMLElement, world: HTMLElement;
const view = { x: 0, y: 0, s: 1 };
const applyView = () => { world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`; };

/** A smooth curve through the steps (Catmull-Rom as cubic Béziers). */
function wayPath(p: { x: number; y: number }[]) {
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c;
    d += ` C${b.x + (c.x - a.x) / 6},${b.y + (c.y - a.y) / 6} ${c.x - (e.x - b.x) / 6},${c.y - (e.y - b.y) / 6} ${c.x},${c.y}`;
  }
  return d;
}

async function openMap() {
  const path = readPath().slice(-8);
  const used = new Set(path.map((s) => s.id));
  // A few roads not taken at each step: its best matches you didn't follow.
  const alts = await Promise.all(path.map((s) => (s.id ? load(s.id).then((b) => b.matches).catch(() => [] as M[]) : Promise.resolve([] as M[]))));
  const pts = path.map((_, i) => ({ x: i ? Math.sin(i * 1.25) * 80 : 0, y: i * 160 }));

  let html = "", lines = "";
  path.forEach((s, i) => {
    const here = i === path.length - 1;
    html += `<button class="mnode step${here ? " here" : ""}" data-href="${pageHref(s.slug)}" data-x="${pts[i].x}" data-y="${pts[i].y}">`
      + posterHtml({ poster: s.poster || null, name: s.name }, here ? "w185" : "w92", "")
      + `<em class="n">${i + 1}</em><span>${esc(s.name)}</span></button>`;
    const side = pts[i].x > 0.5 ? 1 : pts[i].x < -0.5 ? -1 : (i % 2 ? 1 : -1);
    const picks = alts[i].filter((m) => !used.has(String(m.id))).slice(0, 3);
    picks.forEach((m, k) => {
      used.add(String(m.id));
      const ang = (side > 0 ? 0 : Math.PI) + (k - 1) * 0.75 * side;
      const x = pts[i].x + Math.cos(ang) * 96, y = pts[i].y + Math.sin(ang) * 80;
      lines += `<line x1="${pts[i].x}" y1="${pts[i].y}" x2="${x}" y2="${y}"/>`;
      html += `<button class="mnode alt" data-href="${pageHref(m.slug)}" data-x="${x}" data-y="${y}" title="${esc(m.name)}">${posterHtml(m, "w92", "")}</button>`;
    });
  });
  world.innerHTML = `<svg class="map-lines">${lines}<path class="way" d="${path.length > 1 ? wayPath(pts) : ""}"/></svg>${html}`;
  document.getElementById("map-stats")!.textContent = `${path.length} show${path.length === 1 ? "" : "s"} deep`;

  // Fit everything on screen.
  const nodes = [...world.querySelectorAll<HTMLElement>(".mnode")];
  const xs = nodes.map((n) => Number(n.dataset.x)), ys = nodes.map((n) => Number(n.dataset.y));
  const w = Math.max(...xs) - Math.min(...xs) + 120, h = Math.max(...ys) - Math.min(...ys) + 160;
  view.s = Math.max(0.5, Math.min(1.3, (innerWidth - 24) / w, (innerHeight - 190) / h));
  view.x = -((Math.max(...xs) + Math.min(...xs)) / 2) * view.s;
  view.y = -((Math.max(...ys) + Math.min(...ys)) / 2) * view.s;
  applyView();

  map.hidden = false;
  document.documentElement.style.overflow = "hidden";
  gsap.fromTo(map, { opacity: 0 }, { opacity: 1, duration: dur(0.25) });
  // The gold way draws itself from your first show to here; each step lands as the line reaches it.
  const way = world.querySelector<SVGPathElement>(".way")!;
  const len = path.length > 1 ? way.getTotalLength() : 0;
  const drawTime = Math.min(1.6, 0.3 * path.length);
  gsap.fromTo(way, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur(drawTime), ease: "power1.inOut" });
  nodes.forEach((el) => {
    const step = el.classList.contains("step");
    const i = step ? Number(el.querySelector(".n")!.textContent) - 1 : 0;
    gsap.fromTo(el,
      { x: Number(el.dataset.x), y: Number(el.dataset.y), xPercent: -50, yPercent: -50, scale: 0, opacity: 0 },
      { scale: 1, opacity: step ? 1 : 0.6, duration: dur(0.4), ease: "back.out(1.8)",
        delay: dur(step ? (drawTime * i) / Math.max(1, path.length - 1) : drawTime + 0.1) });
  });
}

function closeMap() {
  gsap.to(map, {
    opacity: 0, duration: dur(0.2),
    onComplete() {
      map.hidden = true;
      world.innerHTML = "";
      document.documentElement.style.overflow = "";
    },
  });
}

function initMap() {
  map = document.getElementById("map")!;
  world = document.getElementById("map-world")!;
  const button = document.getElementById("map-open")!;
  button.hidden = readPath().length < 2;
  button.addEventListener("click", openMap);
  document.getElementById("map-close")!.addEventListener("click", closeMap);

  const pts = new Map<number, { x: number; y: number }>();
  let moved = 0, downOn: Element | null = null;
  const zoomAt = (px: number, py: number, f: number) => {
    const s = Math.max(0.3, Math.min(3, view.s * f));
    const cx = px - innerWidth / 2, cy = py - innerHeight / 2;
    view.x = cx - ((cx - view.x) / view.s) * s;
    view.y = cy - ((cy - view.y) / view.s) * s;
    view.s = s;
    applyView();
  };
  map.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest(".map-head")) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    map.setPointerCapture(e.pointerId);
    if (pts.size === 1) { moved = 0; downOn = e.target as Element; }
  });
  map.addEventListener("pointermove", (e) => {
    const prev = pts.get(e.pointerId);
    if (!prev) return;
    if (pts.size === 1) {
      view.x += e.clientX - prev.x;
      view.y += e.clientY - prev.y;
      moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
      applyView();
    } else if (pts.size === 2) {
      const other = [...pts.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0) zoomAt((e.clientX + other.x) / 2, (e.clientY + other.y) / 2, after / before);
      moved += 100;
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  map.addEventListener("pointerup", (e) => {
    if (!pts.delete(e.pointerId) || pts.size) return;
    const node = downOn?.closest<HTMLElement>(".mnode");
    if (moved < 8 && node) {
      morphTo(node.querySelector("img"), "none");
      location.href = node.dataset.href!;
    }
  });
  map.addEventListener("pointercancel", (e) => pts.delete(e.pointerId));
  map.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
}

// ---------- wiring ----------
export function initExplore() {
  const rows = document.getElementById("rows")!;
  initFan(rows);
  initMap();

  // Rows count only what passes the filters, and say so when a filter empties a row.
  document.addEventListener("filters:change", () => {
    rows.querySelectorAll<HTMLElement>("[data-row]").forEach((row) => {
      const all = row.querySelectorAll(".card").length;
      const shown = row.querySelectorAll(".card:not([data-out])").length;
      const count = row.querySelector("[data-row-count]");
      if (count) count.textContent = shown === all ? `${shown}` : `${shown} of ${all}`;
      const empty = row.querySelector<HTMLElement>(".row-empty");
      if (empty) empty.hidden = shown > 0;
    });
  });

  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!map.hidden) closeMap();
    else if (fanOpen) closeFan();
  });
}
