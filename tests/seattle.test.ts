import { it, expect, vi } from "vitest";
import { SeattleProvider } from "../src/adapters/seattle";
const fixture = () => [
  { account: { accountNumber: "synthetic-account", companyCd: "SPU" } },
  { access_token: "synthetic-guest-token" },
  {
    accountContext: { personId: "synthetic-person", companyCd: "SPU" },
    accountSummaryType: {
      swServices: [
        {
          services: [
            { servicePointId: "garbage", description: "Garbage" },
            { servicePointId: "recycling", description: "Recycle" },
          ],
        },
      ],
    },
  },
  {
    calendar: {
      garbage: ["11/10/2026", "11/27/2026"],
      recycling: ["11/27/2026"],
    },
  },
];
function mockFetch(data: unknown[]) {
  return vi
    .fn<typeof fetch>()
    .mockImplementation(async () => Response.json(data.shift()));
}
it("maps addresses without exposing extra data and excludes inactive services", async () => {
  const a = {
    premCode: "id",
    addressLine1: "600 4TH AVE",
    city: "SEATTLE",
    state: "WA",
    zip: "98104",
  };
  const fetcher = mockFetch([
    {
      address: [
        a,
        { ...a, garbageInactiveInd: true },
        { ...a, garbageInactiveInd: "1" },
      ],
    },
  ]);
  const p = new SeattleProvider(fetcher);
  expect(await p.search("600")).toEqual([
    { id: "id", label: "600 4TH AVE, SEATTLE, WA, 98104" },
  ]);
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
    address: { addressLine1: "600", city: "", zip: "" },
  });
});
it("returns explicit city dates and keeps account details server-side", async () => {
  const fetcher = mockFetch(fixture());
  const result = await new SeattleProvider(
    fetcher,
    () => new Date("2026-11-09T18:00:00Z"),
  ).schedule("premise");
  expect(result.collections).toHaveLength(3);
  expect(result.collections[1].date).toBe("2026-11-27");
  expect(result.calendarId).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(result)).not.toMatch(/synthetic/);
  expect(fetcher.mock.calls.map((c) => String(c[0]))).toEqual(
    [
      "/serviceorder/findAccount",
      "/auth/guest",
      "/guest/swsummary",
      "/solidwastecalendar",
    ].map((p) => "https://myutilities.seattle.gov/rest" + p),
  );
  expect(fetcher.mock.calls[3][1]?.headers).toHaveProperty(
    "Authorization",
    "Bearer synthetic-guest-token",
  );
});
it("does not need a personal credential and has stable calendar IDs", async () => {
  const first = await new SeattleProvider(mockFetch(fixture())).schedule("a");
  const second = await new SeattleProvider(mockFetch(fixture())).schedule("a");
  expect(first.calendarId).toBe(second.calendarId);
});
it.each([{ statusCode: "400" }, { statusCode: 200, address: "bad" }, null])(
  "rejects malformed upstream responses",
  async (data) => {
    await expect(
      new SeattleProvider(mockFetch([data])).search("600"),
    ).rejects.toThrow("unavailable");
  },
);
it("accepts an empty search result", async () => {
  expect(
    await new SeattleProvider(
      mockFetch([{ statusCode: "200", address: [] }]),
    ).search("600"),
  ).toEqual([]);
});
it("handles upstream HTTP failures and timeouts without leaking details", async () => {
  const f = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response("secret", { status: 503 }));
  await expect(new SeattleProvider(f).search("600")).rejects.toThrow(
    "unavailable",
  );
  f.mockRejectedValue(new Error("private"));
  await expect(new SeattleProvider(f).search("600")).rejects.toThrow(
    "unavailable",
  );
});
it("rejects non-SPU accounts", async () => {
  await expect(
    new SeattleProvider(
      mockFetch([{ account: { accountNumber: "x", companyCd: "SCL" } }]),
    ).schedule("id"),
  ).rejects.toThrow("does not have");
});
it("rejects missing service data", async () => {
  const data = fixture();
  data[2].accountSummaryType!.swServices = [];
  await expect(
    new SeattleProvider(mockFetch(data)).schedule("id"),
  ).rejects.toThrow("No collection");
});
it("rejects incomplete calendars", async () => {
  const data = fixture();
  data[3] = { calendar: { garbage: [], recycling: undefined } } as never;
  await expect(
    new SeattleProvider(mockFetch(data)).schedule("id"),
  ).rejects.toThrow("incomplete");
});
it.each(["2026-11-10", "02/30/2026"])("rejects bad date %s", async (date) => {
  const data = fixture();
  data[3].calendar!.garbage = [date];
  await expect(
    new SeattleProvider(mockFetch(data)).schedule("id"),
  ).rejects.toThrow("invalid");
});

it("uses the global fetch receiver required by Workers and refuses redirects", async () => {
  const fetcher = vi.fn(function (
    this: unknown,
    _url: unknown,
    init?: RequestInit,
  ) {
    expect(this).toBe(globalThis);
    expect(init?.redirect).toBe("manual");
    return Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { Location: "https://other.test" },
      }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  try {
    await expect(new SeattleProvider().search("600")).rejects.toThrow(
      "unavailable",
    );
  } finally {
    vi.unstubAllGlobals();
  }
  expect(fetcher).toHaveBeenCalledTimes(1);
});
