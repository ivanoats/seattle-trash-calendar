import { CalendarError, normalizeCollections } from "../domain/calendar";
import type { ScheduleProvider } from "./ports";
export class Lookup {
  constructor(private readonly provider: ScheduleProvider) {}
  search(query: string) {
    const address = query.trim();
    if (
      address.length < 3 ||
      address.length > 160 ||
      Array.from(address).some((c) => c.charCodeAt(0) < 32)
    )
      throw new CalendarError(
        "Enter a street address between 3 and 160 characters.",
      );
    return this.provider.search(address);
  }
  async schedule(id: string) {
    if (
      !id ||
      id.length > 200 ||
      Array.from(id).some((c) => c.charCodeAt(0) < 32)
    )
      throw new CalendarError("Choose an address from the search results.");
    const result = await this.provider.schedule(id);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(result.fetchedAt));
    const collections = normalizeCollections(result.collections).filter(
      (c) => c.date >= today,
    );
    if (!collections.length)
      throw new CalendarError(
        "Seattle returned no upcoming collections for this address. Check the official lookup.",
        404,
      );
    return { ...result, collections };
  }
}
