// Every page for search engines: the home page, the About page and one page per show (well under the 50,000 URLs one sitemap allows).
import type { APIRoute } from "astro";
import { loadCatalogue } from "../lib/catalogue";

export const GET: APIRoute = ({ site }) => {
  const urls = ["/", "/about/", ...loadCatalogue().map((s) => `/shows/${s.slug}/`)].map((path) => `<url><loc>${new URL(path, site)}</loc></url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
