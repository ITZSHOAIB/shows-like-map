// PROTOTYPE: one match as the Drill down variant renders it. Shared by the server (first rows)
// and the browser (the fan and the path map), so both produce the same card markup.
export const IMG = "https://image.tmdb.org/t/p/";

export type Status = "ended" | "cancelled" | "ongoing";
export interface M {
  id: number; slug: string; name: string; year: number | null; poster: string | null;
  status: Status; hours: number | null; seasons: number | null; lang: string; rating: number | null;
  prov: [name: string, logo: string][];
  why: [type: string, text: string][];
  /** Open-data picks not in the catalog: a full poster URL and an outside link instead of a show page. */
  img?: string; href?: string;
}
/** A show's own matches, served per show at /prototype/m/<id>.json. */
export interface Branch { id: number; slug: string; name: string; poster: string | null; matches: M[] }

const MARK: Record<Status, string> = { ended: "✓", cancelled: "⚠", ongoing: "●" };

export const pageHref = (slug: string) => `/prototype/explore/${slug}`;

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function cardHtml(m: M, showWhy: boolean): string {
  const len = [m.seasons ? `${m.seasons} season${m.seasons > 1 ? "s" : ""}` : "", m.hours ? `${m.hours} h` : ""].filter(Boolean).join(" · ");
  const src = m.img ?? (m.poster ? `${IMG}w185${m.poster}` : null);
  const art = src
    ? `<img src="${src}" alt="" class="poster" loading="lazy" draggable="false">`
    : `<span class="poster-ph">${esc(m.name)}</span>`;
  const why = showWhy && m.why.length ? `<span class="c-why">${m.why.slice(0, 2).map((w) => esc(w[1])).join(" · ")}</span>` : "";
  const prov = m.prov.length ? `<span class="c-prov">${m.prov.slice(0, 3).map(([n, l]) => `<img src="${IMG}w92${l}" alt="${esc(n)}">`).join("")}</span>` : "";
  if (m.href) {
    return `<a class="card ext" href="${m.href}" target="_blank" rel="noopener" draggable="false">`
      + `<span class="art">${art}${m.rating ? `<span class="rate" title="TVmaze rating">★ ${m.rating.toFixed(1)}</span>` : ""}</span>`
      + `<b class="c-title">${esc(m.name)}</b>`
      + `<span class="c-meta"><span class="badge ${m.status}">${MARK[m.status]}</span> ${m.year ?? ""} · TVmaze ↗</span>`
      + why + `</a>`;
  }
  return `<a class="card" href="${pageHref(m.slug)}" draggable="false" data-hop="${m.id}" data-name="${esc(m.name)}" data-poster="${m.poster ?? ""}"`
    + ` data-status="${m.status}" data-hours="${m.hours ?? ""}" data-providers="${esc(m.prov.map((p) => p[0]).join("|"))}" data-lang="${m.lang}">`
    + `<span class="art">${art}${m.rating ? `<span class="rate" title="TMDB user score">★ ${m.rating.toFixed(1)}</span>` : ""}</span>`
    + `<b class="c-title">${esc(m.name)}</b>`
    + `<span class="c-meta"><span class="badge ${m.status}">${MARK[m.status]}</span> ${len || m.year || ""}</span>`
    + why + prov + `</a>`;
}
