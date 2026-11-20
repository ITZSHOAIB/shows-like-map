// Serves dist/ for the Playwright tests the way Cloudflare Pages does: index.html for folders, 404.html for anything
// missing, ETags with must-revalidate for pages, and the Cache-Control rules from _headers (only "/path/*" patterns).
// A "net=<round trip ms>,<kbit/s>" cookie slows each response like a phone network would, timing the gzipped size as
// Cloudflare sends it. Chrome's own network emulation skips speculation-rule prefetches, so it can't be used for this.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = "dist";
const PORT = Number(process.env.PORT ?? 4480);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain",
};

const rules: [prefix: string, cacheControl: string][] = [];
let prefix = "";
for (const line of readFileSync(join(ROOT, "_headers"), "utf8").split("\n")) {
  if (/^\S/.test(line) && !line.startsWith("#")) prefix = line.trim().replace(/\*$/, "");
  const m = /^\s+Cache-Control:\s*(.+)$/i.exec(line);
  if (m && prefix) rules.push([prefix, m[1].trim()]);
}

function resolve(url: string): [file: string, status: number] {
  const path = decodeURIComponent(new URL(url, "http://x").pathname);
  for (const file of [join(ROOT, path), join(ROOT, path, "index.html"), join(ROOT, `${path}.html`)]) {
    if (existsSync(file) && statSync(file).isFile()) return [file, 200];
  }
  return [join(ROOT, "404.html"), 404];
}

createServer(async (req, res) => {
  const [file, status] = resolve(req.url ?? "/");
  const body = readFileSync(file);
  const etag = `"${createHash("sha1").update(body).digest("hex").slice(0, 16)}"`;
  const cacheControl = rules.find(([p]) => req.url!.startsWith(p))?.[1] ?? "public, max-age=0, must-revalidate";
  const headers = { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": cacheControl, ETag: etag };
  const net = /(?:^|; )net=(\d+),(\d+)/.exec(req.headers.cookie ?? "");
  const notModified = status === 200 && req.headers["if-none-match"] === etag;
  if (net) {
    const bits = notModified ? 0 : gzipSync(body).length * 8;
    await new Promise((r) => setTimeout(r, Number(net[1]) + bits / Number(net[2])));
  }
  if (notModified) return res.writeHead(304, headers).end();
  res.writeHead(status, headers).end(body);
}).listen(PORT, () => console.log(`dist/ on http://localhost:${PORT}`));
