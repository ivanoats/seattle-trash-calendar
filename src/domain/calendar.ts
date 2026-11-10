export const services = ["Garbage", "Recycle", "Food/Yard Waste"] as const;
export type Service = (typeof services)[number];
export interface Collection {
  date: string;
  service: Service;
}
export interface Schedule {
  calendarId: string;
  collections: Collection[];
  fetchedAt: string;
  recentCollections?: Collection[];
}
export interface Address {
  id: string;
  label: string;
}
export class CalendarError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function normalizeCollections(collections: Collection[]): Collection[] {
  if (
    collections.some((c) => !validDate(c.date) || !services.includes(c.service))
  )
    throw new CalendarError(
      "The collection schedule contains an invalid date or service.",
      502,
    );
  return [
    ...new Map(collections.map((c) => [`${c.date}:${c.service}`, c])).values(),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.service.localeCompare(b.service),
  );
}
