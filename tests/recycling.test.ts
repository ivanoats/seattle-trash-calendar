import { expect, it } from "vitest";
import { recyclingWeek } from "../src/domain/recycling";
import type { Collection } from "../src/domain/calendar";
const dates = (...values: string[]): Collection[] =>
  values.map((date) => ({ date, service: "Recycle" }));
it.each([
  ["2026-11-09T18:00:00Z", ["2026-11-12"], "this-week"],
  ["2026-11-12T18:00:00Z", ["2026-11-12"], "today"],
  ["2026-11-13T18:00:00Z", ["2026-11-12", "2026-11-26"], "passed"],
  ["2026-11-13T18:00:00Z", ["2026-11-26"], "later"],
  ["2026-11-13T18:00:00Z", [], "unknown"],
  ["2026-11-16T07:30:00Z", ["2026-11-15"], "today"],
  ["2026-11-16T08:00:00Z", ["2026-11-15", "2026-11-29"], "later"],
  ["2026-03-08T10:30:00Z", ["2026-03-08"], "today"],
])("uses Seattle dates for %s", (instant, values, state) => {
  expect(recyclingWeek(dates(...values), instant).state).toBe(state);
});
it("uses Monday–Sunday across year boundaries and ignores other services", () => {
  expect(
    recyclingWeek(
      [
        { date: "2027-01-01", service: "Garbage" },
        ...dates("2027-01-03", "2026-12-31", "2026-12-31"),
      ],
      "2027-01-01T18:00:00Z",
    ),
  ).toMatchObject({
    weekStart: "2026-12-28",
    weekEnd: "2027-01-03",
    next: "2027-01-03",
    past: "2026-12-31",
    state: "this-week",
  });
});
it("reports a past date even when no future recycling dates were returned", () => {
  expect(
    recyclingWeek(dates("2026-11-12"), "2026-11-13T18:00:00Z"),
  ).toMatchObject({ state: "passed", next: undefined });
});
