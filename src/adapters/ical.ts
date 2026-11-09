import {
  CalendarError,
  normalizeCollections,
  services,
} from "../domain/calendar";
import type { Schedule } from "../domain/calendar";
import type { CalendarWriter } from "../application/ports";
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
export function foldLine(text: string): string {
  let result = "",
    line = "",
    bytes = 0;
  for (const char of text) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      result += line + "\r\n";
      line = " ";
      bytes = 1;
    }
    line += char;
    bytes += size;
  }
  return result + line;
}
export class IcalWriter implements CalendarWriter {
  write(schedule: Schedule, selected: readonly string[]): string {
    const collections = normalizeCollections(schedule.collections).filter((c) =>
      selected.includes(c.service),
    );
    if (!collections.length)
      throw new CalendarError("Select at least one collection type.");
    const stamp = new Date(schedule.fetchedAt)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Seattle Pickup//Calendar Maker//EN",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:Seattle pickup",
    ];
    for (const c of collections) {
      const end = new Date(c.date + "T00:00:00Z");
      end.setUTCDate(end.getUTCDate() + 1);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${schedule.calendarId}-${c.date}-${services.indexOf(c.service)}@seattle-pickup.invalid`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${c.date.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll("-", "")}`,
        `SUMMARY:${escapeText(c.service + " pickup")}`,
        "DESCRIPTION:From Seattle Public Utilities. This downloaded calendar does not update automatically. Check SPU for weather delays.",
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      );
    }
    return [...lines, "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
  }
}
