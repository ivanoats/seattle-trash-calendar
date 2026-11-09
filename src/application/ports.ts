import type { Address, Schedule } from "../domain/calendar";
export interface ScheduleProvider {
  search(address: string): Promise<Address[]>;
  schedule(premise: string): Promise<Schedule>;
}
export interface CalendarWriter {
  write(schedule: Schedule, selected: readonly string[]): string;
}
