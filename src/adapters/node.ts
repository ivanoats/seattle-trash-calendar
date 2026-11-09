import { createServer } from "node:http";
import { createHandler } from "./http";
import { SeattleProvider } from "./seattle";
const handler = createHandler(new SeattleProvider());
createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2048) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers))
      if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
    // Vite forwards the browser Host header, preserving the same-origin check.
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers,
      ...(req.method === "GET" || req.method === "HEAD"
        ? {}
        : { body: Buffer.concat(chunks) }),
    });
    const result = await handler(request);
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(await result.text());
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(8788, "127.0.0.1", () =>
  console.log("API listening on http://127.0.0.1:8788"),
);
