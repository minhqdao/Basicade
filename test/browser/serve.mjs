import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const host = "127.0.0.1";
const port = 4173;
const dist = resolve("dist");
const basePath = "/Basicade/";
const contentTypes = new Map([
  [".bas", "text/plain; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

function sendFile(path, response) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes.get(extname(path)) ?? "application/octet-stream",
  });
  createReadStream(path).pipe(response);
}

createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${host}:${port}`).pathname;
  if (!pathname.startsWith(basePath)) {
    response.writeHead(404).end();
    return;
  }

  const relativePath = decodeURIComponent(pathname.slice(basePath.length));
  const requestedPath = resolve(dist, relativePath || "index.html");
  if (!requestedPath.startsWith(`${dist}${sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const metadata = await stat(requestedPath);
    sendFile(
      metadata.isDirectory() ? resolve(requestedPath, "index.html") : requestedPath,
      response,
    );
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, host, () => {
  console.log(`Basicade browser-test server: http://${host}:${port}${basePath}`);
});
