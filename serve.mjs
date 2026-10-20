import http from "node:http";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "web");
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex < 0 ? 8787 : Number(args[portIndex + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Port must be 1024–65535");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".glsl": "text/plain",
};
const server = http.createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const target = await realpath(path.resolve(root, relative));
    if (!target.startsWith(root + path.sep) || !types[path.extname(target)]) {
      res.writeHead(403);
      res.end();
      return;
    }
    const bytes = await readFile(target);
    res.writeHead(200, {
      "Content-Type": types[path.extname(target)] + "; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; img-src 'self' data: blob: https: http:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https: http:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Momo Texture Forge: http://127.0.0.1:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
