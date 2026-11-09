import { describe, it, expect } from "vitest";
import ICAL from "ical.js";
import {
  validDate,
  normalizeCollections,
  services,
} from "../src/domain/calendar";
import { IcalWriter, escapeText, foldLine } from "../src/adapters/ical";
import { schedule } from "./fixtures";
describe("calendar rules", () => {
  it.each(["2024-02-29", "2026-11-27"])("accepts real date %s", (date) =>
    expect(validDate(date)).toBe(true),
  );
  it.each(["2026-02-29", "2026-13-01", "2026-01-32", "not a date", "2026-1-1"])(
    "rejects invalid date %s",
    (date) => expect(validDate(date)).toBe(false),
  );
  it("deduplicates and orders services and dates", () => {
    const rows = [...schedule.collections].reverse();
    expect(normalizeCollections([...rows, ...rows])).toEqual(
      normalizeCollections(schedule.collections),
    );
  });
  it("rejects malformed source dates and unknown services", () => {
    expect(() =>
      normalizeCollections([{ date: "bad", service: "Garbage" }]),
    ).toThrow();
    expect(() =>
      normalizeCollections([
        { date: "2026-01-01", service: "unknown" as "Garbage" },
      ]),
    ).toThrow();
  });
});
describe("RFC 5545 export", () => {
  it("round trips through an independent parser with all-day exclusive end dates", () => {
    const text = new IcalWriter().write(schedule, services);
    const calendar = new ICAL.Component(ICAL.parse(text));
    const events = calendar
      .getAllSubcomponents("vevent")
      .map((c) => new ICAL.Event(c));
    expect(events).toHaveLength(5);
    expect(events[0].startDate.isDate).toBe(true);
    expect(events[0].startDate.toString()).toBe("2026-11-10");
    expect(events[0].endDate.toString()).toBe("2026-11-11");
    expect(events.at(-1)?.startDate.toString()).toBe("2026-11-27");
    expect(text.endsWith("\r\n")).toBe(true);
    expect(text.replaceAll("\r\n", "")).not.toContain("\n");
  });
  it("filters services and refuses an empty selection", () => {
    expect(
      new IcalWriter().write(schedule, ["Recycle"]).match(/BEGIN:VEVENT/g),
    ).toHaveLength(2);
    expect(() => new IcalWriter().write(schedule, [])).toThrow("Select");
  });
  it("has stable IDs across downloads and distinct IDs across premises", () => {
    const writer = new IcalWriter();
    const ids = (s: typeof schedule) =>
      writer.write(s, services).match(/UID:[^\r]+/g);
    expect(ids({ ...schedule, fetchedAt: "2026-11-11T18:00:00Z" })).toEqual(
      ids(schedule),
    );
    expect(ids({ ...schedule, calendarId: "another-premise" })).not.toEqual(
      ids(schedule),
    );
  });
  it("handles leap days and year rollover", () => {
    const text = new IcalWriter().write(
      {
        ...schedule,
        collections: [
          { date: "2024-02-29", service: "Garbage" },
          { date: "2026-12-31", service: "Garbage" },
        ],
      },
      services,
    );
    expect(text).toContain("DTEND;VALUE=DATE:20240301");
    expect(text).toContain("DTEND;VALUE=DATE:20270101");
  });
  it("escapes text and folds UTF-8 at 75 octets without splitting characters", () => {
    expect(escapeText("a\\b;c,d\r\ne\nf\rg")).toBe(
      "a\\\\b\\;c\\,d\\ne\\nf\\ng",
    );
    const original = "SUMMARY:" + "♻️ Seattle ".repeat(20);
    const folded = foldLine(original);
    for (const line of folded.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replaceAll("\r\n ", "")).toBe(original);
  });
});
