import { createHandler } from "./http";
import { SeattleProvider } from "./seattle";
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  LOOKUP_LIMITER: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
}
const handler = createHandler(new SeattleProvider());
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith("/api/"))
      return env.ASSETS.fetch(request);
    const { success } = await env.LOOKUP_LIMITER.limit({
      key: request.headers.get("CF-Connecting-IP") ?? "unknown",
    });
    if (!success)
      return Response.json(
        { error: "Too many lookups. Please wait a minute and try again." },
        {
          status: 429,
          headers: { "Retry-After": "60", "Cache-Control": "no-store" },
        },
      );
    return handler(request);
  },
};
