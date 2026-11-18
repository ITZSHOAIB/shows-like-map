// PROTOTYPE client shell: filters, search, poster tint and the hop morph (the path strip is an inline script in Shell).
// Variants listen for the "filters:change" event and decide how filtered-out shows look.

type Filters = { finished: boolean; maxHours: number; services: string[]; lang: string };

const IMG = "https://image.tmdb.org/t/p/";
const store = {
  get<T>(area: Storage, key: string, fallback: T): T {
    try { return JSON.parse(area.getItem(key) ?? "") as T; } catch { return fallback; }
  },
  set(area: Storage, key: string, value: unknown) {
    try { area.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

const body = document.body;
const variant = body.dataset.variant;
const hopHref = (slug: string) => `/prototype/${variant ?? "explore"}/${slug}`;

// ---------- filters ----------
const DEFAULT_FILTERS: Filters = { finished: false, maxHours: 0, services: [], lang: "" };
export const getFilters = () => ({ ...DEFAULT_FILTERS, ...store.get(localStorage, "slm:filters", DEFAULT_FILTERS) });

export function passes(el: HTMLElement, f: Filters): boolean {
  const d = el.dataset;
  if (f.finished && d.status === "ongoing") return false;
  if (f.maxHours && !(Number(d.hours) > 0 && Number(d.hours) <= f.maxHours)) return false;
  if (f.services.length && !(d.providers ?? "").split("|").some((p) => f.services.includes(p))) return false;
  if (f.lang && d.lang !== f.lang) return false;
  return true;
}

export function applyFilters() {
  const f = getFilters();
  const targets = [...document.querySelectorAll<HTMLElement>("[data-hop]")];
  const ids = new Set<string>(), inIds = new Set<string>();
  for (const el of targets) {
    const ok = passes(el, f);
    el.toggleAttribute("data-out", !ok);
    ids.add(el.dataset.hop!);
    if (ok) inIds.add(el.dataset.hop!);
  }
  const active = f.finished || f.maxHours || f.services.length || f.lang;
  const count = document.getElementById("fcount");
  if (count) count.textContent = active ? `${inIds.size} of ${ids.size} match` : "";
  document.dispatchEvent(new CustomEvent("filters:change", { detail: { filters: f, inCount: inIds.size } }));
}

function initFilters() {
  const root = document.getElementById("filters");
  if (!root) return;
  const finished = root.querySelector<HTMLButtonElement>('[data-f="finished"]')!;
  const hours = root.querySelector<HTMLSelectElement>('[data-f="hours"]')!;
  const lang = root.querySelector<HTMLSelectElement>('[data-f="lang"]')!;
  const boxes = [...root.querySelectorAll<HTMLInputElement>('[data-f="service"]')];
  const summary = root.querySelector<HTMLElement>("[data-services-summary]")!;

  const sync = () => {
    const cur = getFilters();
    finished.setAttribute("aria-pressed", String(cur.finished));
    hours.value = String(cur.maxHours);
    hours.parentElement!.classList.toggle("on", !!cur.maxHours);
    lang.value = cur.lang;
    lang.parentElement!.classList.toggle("on", !!cur.lang);
    boxes.forEach((b) => (b.checked = cur.services.includes(b.value)));
    summary.textContent = cur.services.length ? `My services (${cur.services.length})` : "My services";
    summary.parentElement!.classList.toggle("on", cur.services.length > 0);
  };
  const save = (patch: Partial<Filters>) => {
    store.set(localStorage, "slm:filters", { ...getFilters(), ...patch });
    sync();
    applyFilters();
  };
  finished.addEventListener("click", () => save({ finished: !getFilters().finished }));
  hours.addEventListener("change", () => save({ maxHours: Number(hours.value) }));
  lang.addEventListener("change", () => save({ lang: lang.value }));
  boxes.forEach((b) => b.addEventListener("change", () => save({ services: boxes.filter((x) => x.checked).map((x) => x.value) })));
  document.addEventListener("click", (e) => {
    const det = summary.parentElement as HTMLDetailsElement;
    if (det.open && !det.contains(e.target as Node)) det.open = false;
  });
  sync();
  // After every variant script has subscribed to "filters:change".
  setTimeout(applyFilters);
}

// ---------- search ----------
type Entry = [slug: string, name: string, original: string, year: number, poster: string];
let index: Entry[] | null = null;
const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

function initSearch() {
  const overlay = document.getElementById("search")!;
  const input = document.getElementById("search-input") as HTMLInputElement;
  const list = document.getElementById("search-results")!;
  let active = 0;

  const open = async () => {
    overlay.hidden = false;
    input.focus();
    index ??= await fetch("/search-index.json").then((r) => r.json());
    render();
  };
  const close = () => { overlay.hidden = true; };
  const render = () => {
    const q = norm(input.value.trim());
    if (!index) return;
    const hits = q
      ? index
          .map((e, rank) => {
            const n = norm(e[1]), o = norm(e[2]);
            const score = n.startsWith(q) ? 0 : n.includes(` ${q}`) ? 1 : n.includes(q) || o.includes(q) ? 2 : -1;
            return { e, score, rank };
          })
          .filter((h) => h.score >= 0)
          .sort((a, b) => a.score - b.score || a.rank - b.rank)
          .slice(0, 12)
          .map((h) => h.e)
      : index.slice(0, 8);
    active = 0;
    list.innerHTML = hits
      .map(([slug, name, original, year, poster], i) => {
        const img = poster ? `<img src="${IMG}w92${poster}" alt="" loading="lazy">` : `<span class="ph"></span>`;
        const sub = [year, original].filter(Boolean).join(" · ");
        return `<li><a href="${hopHref(slug)}" class="${i ? "" : "active"}">${img}<span>${escapeHtml(name)}<small>${escapeHtml(String(sub))}</small></span></a></li>`;
      })
      .join("");
  };
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    const links = [...list.querySelectorAll("a")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(0, Math.min(links.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
      links.forEach((l, i) => l.classList.toggle("active", i === active));
    } else if (e.key === "Enter" && links[active]) links[active].click();
    else if (e.key === "Escape") close();
  });
  document.getElementById("open-search")!.addEventListener("click", open);
  document.getElementById("close-search")!.addEventListener("click", close);
  document.querySelectorAll("[data-open-search]").forEach((b) => b.addEventListener("click", open));
  addEventListener("keydown", (e) => {
    if (e.key === "/" && !isTyping(e.target)) { e.preventDefault(); open(); }
  });
}

// ---------- poster tint ----------
function initTint() {
  const id = body.dataset.showId, path = body.dataset.showPoster;
  if (!id || !path) return;
  const cache = store.get<Record<string, string>>(sessionStorage, "slm:tint", {});
  if (cache[id]) { document.documentElement.style.setProperty("--tint", cache[id]); return; }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `${IMG}w92${path}?tint`; // own URL: the same poster may already be cached without CORS
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 12; c.height = 18;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, 12, 18);
    const px = ctx.getImageData(0, 0, 12, 18).data;
    // Weight saturated pixels more so the tint is the poster's mood, not its grey.
    let r = 0, g = 0, b = 0, w = 0;
    for (let i = 0; i < px.length; i += 4) {
      const max = Math.max(px[i], px[i + 1], px[i + 2]), min = Math.min(px[i], px[i + 1], px[i + 2]);
      const weight = 0.15 + (max - min) / 255;
      r += px[i] * weight; g += px[i + 1] * weight; b += px[i + 2] * weight; w += weight;
    }
    const tint = `${Math.round(r / w)} ${Math.round(g / w)} ${Math.round(b / w)}`;
    document.documentElement.style.setProperty("--tint", tint);
    cache[id] = tint;
    store.set(sessionStorage, "slm:tint", cache);
  };
}

// ---------- hop morph ----------
// The tapped poster takes the name the next page's hero has, and this page's hero takes the name of the
// next page's newest path chip, so the browser morphs one into the other and the old show shrinks into the path.
export function morphTo(img: Element | null | undefined, heroTo = "prev-hero") {
  document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]').forEach((el) => (el.style.viewTransitionName = "none"));
  document.querySelectorAll<HTMLElement>("[data-hero-poster]").forEach((h) => (h.style.viewTransitionName = heroTo));
  if (img instanceof HTMLElement) img.style.viewTransitionName = "hero-poster";
}

function initHopMorph() {
  document.addEventListener("click", (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-hop]");
    if (link && !e.defaultPrevented) morphTo(link.querySelector("img, .poster-ph"));
  });
}

// ---------- variant switcher keys ----------
function initSwitcherKeys() {
  addEventListener("keydown", (e) => {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = e.key === "ArrowLeft" ? "prev" : e.key === "ArrowRight" ? "next" : null;
    if (dir) document.querySelector<HTMLAnchorElement>(`[data-switch="${dir}"]`)?.click();
  });
}

function isTyping(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}
export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function initShell() {
  initFilters();
  initSearch();
  initTint();
  initHopMorph();
  initSwitcherKeys();
}
