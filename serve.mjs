import http from "node:http";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EDITOR_BRIDGE_ORIGIN, EDITOR_BRIDGE_PROTOCOL } from './web/editor-bridge-protocol.js';
let mcp, startingMCP;
async function ensureMCP() {
  if (startingMCP) return startingMCP;
  startingMCP = (async () => {
    try {
      const response = await fetch(EDITOR_BRIDGE_ORIGIN + '/health', { signal: AbortSignal.timeout(1500) });
      if (response.ok && (await response.json()).protocol === EDITOR_BRIDGE_PROTOCOL) return;
      throw new Error('Another service uses the MCP port');
    } catch (error) {
      if (error.message === 'Another service uses the MCP port') throw error;
    }
    const { startEditorMCP } = await import('./editor-mcp.mjs');
    mcp = await startEditorMCP();
  })();
  try { await startingMCP; } finally { startingMCP = null; }
}
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
    if (req.url === '/api/editor-mcp/start') {
      const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
      if (req.method !== 'POST' || !origins.includes(req.headers.origin) ||
          !origins.some(origin => new URL(origin).host === req.headers.host) ||
          req.headers['content-type'] !== 'application/json') {
        res.writeHead(403).end(); return;
      }
      try {
        await ensureMCP();
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ protocol: EDITOR_BRIDGE_PROTOCOL, origin: EDITOR_BRIDGE_ORIGIN }));
      } catch {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Local MCP could not start. Check dependencies and port 8798.' }));
      }
      return;
    }
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
  process.on(signal, () => { server.close(); void mcp?.close(); });
