import type { Schedule } from "../src/domain/calendar";
export const schedule: Schedule = {
  calendarId: "test-premise",
  fetchedAt: "2026-11-09T18:00:00Z",
  collections: [
    { date: "2026-11-10", service: "Garbage" },
    { date: "2026-11-10", service: "Recycle" },
    { date: "2026-11-10", service: "Food/Yard Waste" },
    { date: "2026-11-17", service: "Garbage" },
    { date: "2026-11-27", service: "Recycle" },
  ],
};
export const addresses = [
  { id: "public-test", label: "600 4TH AVE, SEATTLE, WA, 98104" },
];
