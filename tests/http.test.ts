import { it, expect, vi } from "vitest";
import { createHandler } from "../src/adapters/http";
import { CalendarError } from "../src/domain/calendar";
import { schedule, addresses } from "./fixtures";
const provider = {
  search: vi.fn().mockResolvedValue(addresses),
  schedule: vi.fn().mockResolvedValue(schedule),
};
const handler = createHandler(provider);
const req = (
  path = "/api/addresses",
  body: unknown = { query: "600 4th" },
  headers: Record<string, string> = { "Content-Type": "application/json" },
) =>
  new Request("https://example.test" + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
it("returns search and schedule results without caching", async () => {
  const r = await handler(req());
  expect(await r.json()).toEqual({ addresses });
  expect(r.headers.get("Cache-Control")).toBe("no-store");
  expect((await handler(req("/api/schedule", { id: "id" }))).status).toBe(200);
});
it("allows matching origins", async () =>
  expect(
    (
      await handler(
        req(
          "/api/addresses",
          { query: "600" },
          {
            "Content-Type": "application/json",
            Origin: "https://example.test",
          },
        ),
      )
    ).status,
  ).toBe(200));
it.each([
  ["/bad", {}, 404],
  ["/api/addresses", null, 400],
  ["/api/addresses", {}, 400],
  ["/api/addresses", { query: 5 }, 400],
  ["/api/schedule", {}, 400],
  ["/api/schedule", { id: 3 }, 400],
  ["/api/addresses", { query: "a" }, 400],
  ["/api/addresses", { query: "x".repeat(3000) }, 413],
])("validates %s %j", async (path, body, status) =>
  expect((await handler(req(path, body))).status).toBe(status),
);
it("rejects methods, cross-origin and non-JSON", async () => {
  expect(
    (await handler(new Request("https://example.test/api/addresses"))).status,
  ).toBe(405);
  expect((await handler(req("/api/addresses", {}, {}))).status).toBe(415);
  expect(
    (
      await handler(
        req(
          "/api/addresses",
          {},
          { "Content-Type": "application/json", Origin: "https://other.test" },
        ),
      )
    ).status,
  ).toBe(403);
});
it("rejects invalid JSON and an empty body", async () => {
  for (const body of ["bad", undefined])
    expect(
      (
        await handler(
          new Request("https://example.test/api/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          }),
        )
      ).status,
    ).toBe(400);
});
it("returns safe domain errors and masks unexpected exceptions", async () => {
  for (const failure of [
    new Error("private"),
    new CalendarError("Unavailable", 503),
  ]) {
    const h = createHandler({
      search: vi.fn().mockRejectedValue(failure),
      schedule: provider.schedule,
    });
    const r = await h(req());
    expect(r.status).toBe(failure instanceof CalendarError ? 503 : 502);
    expect(await r.text()).not.toContain("private");
  }
});
