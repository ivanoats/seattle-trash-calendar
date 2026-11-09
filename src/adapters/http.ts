import { CalendarError } from "../domain/calendar";
import { Lookup } from "../application/lookup";
import type { ScheduleProvider } from "../application/ports";
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
export function createHandler(provider: ScheduleProvider) {
  const lookup = new Lookup(provider);
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (!["/api/addresses", "/api/schedule"].includes(url.pathname))
      return json({ error: "Not found." }, 404);
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== url.origin
    )
      return json({ error: "Cross-origin requests are not allowed." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return json({ error: "Send JSON." }, 415);
    try {
      // Stream a bounded body: Content-Length alone cannot be trusted.
      const reader = request.body?.getReader();
      let bytes = 0,
        text = "";
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > 2048) {
            await reader.cancel();
            return json({ error: "Request is too large." }, 413);
          }
          text += decoder.decode(part.value, { stream: true });
        }
        text += decoder.decode();
      }
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "Send valid JSON." }, 400);
      }
      if (!body || typeof body !== "object")
        return json({ error: "Send an address or selected address ID." }, 400);
      if (url.pathname === "/api/addresses") {
        if (!("query" in body) || typeof body.query !== "string")
          return json({ error: "Enter a street address." }, 400);
        return json({ addresses: await lookup.search(body.query) });
      }
      if (!("id" in body) || typeof body.id !== "string")
        return json({ error: "Choose an address." }, 400);
      return json(await lookup.schedule(body.id));
    } catch (error) {
      return error instanceof CalendarError
        ? json({ error: error.message }, error.status)
        : json(
            { error: "The lookup could not be completed. Please try again." },
            502,
          );
    }
  };
}
