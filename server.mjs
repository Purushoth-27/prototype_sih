import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const distDir = join(process.cwd(), "dist");
const indexPath = join(distDir, "index.html");
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
} ;

function safeAssetPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleanPath = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return join(distDir, cleanPath);
}

async function sendFile(filePath, res) {
  const extension = extname(filePath).toLowerCase();
  const fileInfo = await stat(filePath);

  res.writeHead(200, {
    "Content-Length": fileInfo.size,
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });

  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  if (!existsSync(indexPath)) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Build output not found. Run `npm run build` before starting the server.");
    return;
  }

  const requestPath = req.url || "/";

  try {
    if (requestPath !== "/" && !requestPath.endsWith("/")) {
      const assetPath = safeAssetPath(requestPath);
      if (assetPath.startsWith(distDir) && existsSync(assetPath)) {
        await sendFile(assetPath, res);
        return;
      }
    }

    const html = await readFile(indexPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
    res.end(html);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Unable to serve application.");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`AXIS prototype listening on port ${port}`);
});
