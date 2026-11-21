// A show tile built in the browser, the same markup Tile.astro builds at build time: home search results and /kept/.
import star from "@phosphor-icons/core/assets/duotone/star-duotone.svg?raw";
import { POSTERS, type Entry } from "./search";

export function tileOf([slug, name, year, status, hours, poster, , rating]: Entry, labels: Record<string, string>) {
  const a = document.createElement("a");
  a.className = "tile";
  a.href = `/shows/${slug}/`;
  if (poster) a.append(Object.assign(new Image(210, 295), { className: "poster", src: POSTERS + poster, alt: "", decoding: "async" }));
  else a.append(Object.assign(document.createElement("span"), { className: "poster-ph", ariaHidden: "true", textContent: name }));
  const meta = Object.assign(document.createElement("span"), { className: `t-meta s-${status}` });
  if (year) meta.append(Object.assign(document.createElement("span"), { className: "t-year", textContent: year }));
  meta.append(Object.assign(document.createElement("span"), { className: "dot" }), labels[status], hours ? ` · ${hours}` : "");
  a.append(Object.assign(document.createElement("b"), { className: "t-name", textContent: name }), meta);
  if (rating) {
    const rate = Object.assign(document.createElement("span"), { className: "rate" });
    rate.innerHTML = star.replace("<svg ", '<svg class="icon" aria-hidden="true" ');
    rate.append(Object.assign(document.createElement("span"), { className: "sr-only", textContent: "rated " }), rating.toFixed(1));
    a.append(rate);
  }
  return a;
}
