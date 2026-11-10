import type { Collection } from "./calendar";

export function seattleDate(instant: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

/** Calendar weeks run Monday through Sunday in Seattle, not the viewer's zone. */
export function recyclingWeek(collections: Collection[], instant: string) {
  const today = seattleDate(instant);
  const start = new Date(today + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const weekStart = start.toISOString().slice(0, 10);
  const weekEnd = end.toISOString().slice(0, 10);
  const dates = [
    ...new Set(
      collections.filter((c) => c.service === "Recycle").map((c) => c.date),
    ),
  ].sort();
  const next = dates.find((date) => date >= today);
  const past = dates.filter((date) => date >= weekStart && date < today).at(-1);
  const state: "today" | "this-week" | "passed" | "later" | "unknown" =
    next === today
      ? "today"
      : next && next <= weekEnd
        ? "this-week"
        : past
          ? "passed"
          : next
            ? "later"
            : "unknown";
  return { state, next, past, today, weekStart, weekEnd };
}
