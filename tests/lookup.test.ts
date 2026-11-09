import { it, expect, vi } from "vitest";
import { Lookup } from "../src/application/lookup";
import { schedule, addresses } from "./fixtures";
const provider = () => ({
  search: vi.fn().mockResolvedValue(addresses),
  schedule: vi.fn().mockResolvedValue(schedule),
});
it("trims address input and delegates", async () => {
  const p = provider();
  expect(await new Lookup(p).search("  600 4th  ")).toEqual(addresses);
  expect(p.search).toHaveBeenCalledWith("600 4th");
});
it.each(["a", "x".repeat(161), "600\n4th"])(
  "rejects malformed search input",
  (q) => expect(() => new Lookup(provider()).search(q)).toThrow(),
);
it.each(["", "x".repeat(201), "\n"])(
  "rejects malformed premise ID",
  async (id) => {
    await expect(new Lookup(provider()).schedule(id)).rejects.toThrow();
  },
);
it("filters past dates using Seattle local date, deduplicates and sorts", async () => {
  const p = provider();
  p.schedule.mockResolvedValue({
    ...schedule,
    fetchedAt: "2026-11-11T01:00:00Z",
    collections: [
      ...schedule.collections,
      ...schedule.collections,
      { date: "2026-11-09", service: "Garbage" },
    ],
  });
  expect((await new Lookup(p).schedule("id")).collections).toHaveLength(5);
});
it("rejects empty and expired schedules", async () => {
  const p = provider();
  p.schedule.mockResolvedValue({ ...schedule, collections: [] });
  await expect(new Lookup(p).schedule("id")).rejects.toThrow("no upcoming");
});
