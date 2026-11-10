import "../styled-system/styles.css";
import "./style.css";
import { button, card, fieldInput } from "../styled-system/recipes";

document
  .querySelectorAll(".lookup, .preview")
  .forEach((el) => el.classList.add(card()));
document
  .querySelectorAll("#search, #download")
  .forEach((el) => (el.className = button({ variant: "primary" })));
document.querySelector("#address")!.className = fieldInput();
import { IcalWriter } from "./adapters/ical";
import { RememberedAddress } from "./adapters/remembered-address";
import { recyclingWeek } from "./domain/recycling";
import type { Address, Schedule } from "./domain/calendar";
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const addressButtonClass = button({ variant: "secondary" });
const form = element<HTMLFormElement>("search-form");
const input = element<HTMLInputElement>("address");
const status = element("status");
const error = element("error");
let schedule: Schedule | undefined;
let busy = false;
let chosenAddress: Address | undefined;
const remembered = new RememberedAddress(() => window.localStorage);
const remember = element<HTMLInputElement>("remember-address");
function renderSaved() {
  const saved = remembered.read();
  element("saved-address").hidden = !saved;
  element("saved-label").textContent = saved
    ? `Saved on this device: ${saved.label}`
    : "";
  element("forget-address").hidden = !saved;
}
function forgetAddress() {
  if (!remembered.forget()) {
    remember.checked = remembered.read()?.id === chosenAddress?.id;
    showError(
      "We couldn’t remove the saved address. Please clear this site’s data in your browser settings.",
    );
    return false;
  }
  remember.checked = false;
  renderSaved();
  element("remember-status").textContent = "Address forgotten on this device.";
  return true;
}
const selected = () =>
  Array.from(
    document.querySelectorAll<HTMLInputElement>("#services input:checked"),
  ).map((c) => c.value);
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date + "T00:00:00Z"));
function setBusy(value: boolean) {
  busy = value;
  input.disabled = value;
  element<HTMLButtonElement>("search").disabled = value;
  form.setAttribute("aria-busy", String(value));
  for (const id of [
    "change-address",
    "forget-address",
    "forget-saved",
    "remember-address",
  ]) {
    element<HTMLButtonElement>(id).disabled = value;
  }
  document
    .querySelectorAll<HTMLButtonElement>("#addresses button")
    .forEach((b) => (b.disabled = value));
}
function showError(message: string) {
  error.textContent = message;
  error.hidden = false;
  status.textContent = "";
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || "The lookup failed. Please try again.");
  return data as T;
}
function clearSchedule() {
  schedule = undefined;
  chosenAddress = undefined;
  element("recycling-answer").hidden = true;
  element("options").hidden = true;
  element("collections").replaceChildren();
  element("range").textContent = "";
  element("empty").hidden = false;
  element("preview-note").hidden = true;
}
function renderPreview() {
  if (!schedule) return;
  const dates = new Map<string, string[]>();
  for (const c of schedule.collections.filter((c) =>
    selected().includes(c.service),
  )) {
    dates.set(c.date, [...(dates.get(c.date) ?? []), c.service]);
  }
  const list = element("collections");
  list.replaceChildren();
  for (const [date, types] of [...dates].slice(0, 8)) {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = date;
    time.textContent = dateLabel(date);
    const text = document.createElement("span");
    text.textContent = types.join(" + ");
    li.append(time, text);
    list.append(li);
  }
  const keys = [...dates.keys()];
  element("range").textContent = keys.length
    ? `${keys.length} pickup days · ${dateLabel(keys[0])} – ${dateLabel(keys.at(-1)!)}`
    : "Choose at least one collection type.";
  element<HTMLButtonElement>("download").disabled = !keys.length;
  element("empty").hidden = true;
  element("preview-note").hidden = !keys.length;
}
function renderRecycling() {
  if (!schedule) return;
  const answer = recyclingWeek(
    [...schedule.collections, ...(schedule.recentCollections ?? [])],
    schedule.fetchedAt,
  );
  const headings = {
    today: "Recycling is scheduled for today.",
    "this-week": "Yes, this is recycling week.",
    passed: "This week’s recycling date has passed.",
    later: "No recycling pickup scheduled for the rest of this week.",
    unknown: "No upcoming recycling date available.",
  };
  element("recycling-heading").textContent = headings[answer.state];
  element("recycling-detail").textContent = [
    answer.state === "passed"
      ? `Recycling was scheduled for ${dateLabel(answer.past!)}.`
      : "",
    answer.next
      ? `Next recycling pickup: ${dateLabel(answer.next)}.`
      : "Seattle returned no upcoming recycling dates. Check the official lookup.",
  ]
    .filter(Boolean)
    .join(" ");
  element("recycling-week").textContent =
    `Week of ${dateLabel(answer.weekStart)} – ${dateLabel(answer.weekEnd)} (Monday–Sunday, Seattle time). Checked ${dateLabel(answer.today)}.`;
  element("recycling-answer").hidden = false;
}
async function choose(address: Address) {
  if (busy) return;
  setBusy(true);
  error.hidden = true;
  clearSchedule();
  status.textContent = "Getting your collection dates from Seattle…";
  try {
    schedule = await post<Schedule>("/api/schedule", { id: address.id });
    chosenAddress = address;
    input.value = address.label;
    remember.checked = remembered.read()?.id === address.id;
    element("remember-status").textContent = "";
    renderSaved();
    element("selected-address").textContent = address.label;
    element("matches").hidden = true;
    const container = element("services");
    container.replaceChildren();
    for (const type of new Set(schedule.collections.map((c) => c.service))) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = type;
      checkbox.checked = true;
      checkbox.addEventListener("change", renderPreview);
      label.append(checkbox, document.createTextNode(type));
      container.append(label);
    }
    element("options").hidden = false;
    renderPreview();
    renderRecycling();
    status.textContent =
      "Your calendar is ready. Choose which collections to include.";
    element("recycling-answer").focus();
  } catch (e) {
    showError(e instanceof Error ? e.message : "Unable to load this schedule.");
  } finally {
    setBusy(false);
  }
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  clearSchedule();
  error.hidden = true;
  element("matches").hidden = true;
  element("addresses").replaceChildren();
  setBusy(true);
  status.textContent = "Finding matching Seattle addresses…";
  try {
    const { addresses } = await post<{ addresses: Address[] }>(
      "/api/addresses",
      { query: input.value },
    );
    if (!addresses.length) {
      showError(
        "No active collection addresses found. Try the street number and street name, or use Seattle’s official lookup.",
      );
      return;
    }
    for (const address of addresses) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = addressButtonClass;
      button.textContent = address.label;
      button.addEventListener("click", () => void choose(address));
      li.append(button);
      element("addresses").append(li);
    }
    element("matches").hidden = false;
    status.textContent = `${addresses.length} matching address${addresses.length === 1 ? "" : "es"} found. Choose yours below.`;
  } catch (e) {
    showError(e instanceof Error ? e.message : "Unable to find addresses.");
  } finally {
    setBusy(false);
  }
});
input.addEventListener("input", () => {
  clearSchedule();
  element("matches").hidden = true;
  status.textContent = "";
  error.hidden = true;
});
element("download").addEventListener("click", () => {
  if (!schedule) return;
  const data = new IcalWriter().write(schedule, selected());
  const url = URL.createObjectURL(
    new Blob([data], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "seattle-pickup.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent =
    "Calendar downloaded. Import the file into your calendar app.";
});

remember.addEventListener("change", () => {
  if (!chosenAddress) return;
  if (!remember.checked) {
    forgetAddress();
    return;
  }
  if (remembered.save(chosenAddress)) {
    element("remember-status").textContent =
      "Address saved in this browser. We’ll check Seattle again when you return.";
  } else {
    remember.checked = false;
    element("remember-status").textContent =
      "This browser couldn’t save your address. You can still use the calendar.";
  }
  renderSaved();
});
element("forget-address").addEventListener("click", forgetAddress);
element("change-address").addEventListener("click", () => {
  clearSchedule();
  input.value = "";
  status.textContent =
    "Enter another address. A saved address stays saved until you forget it or remember a new one.";
  input.focus();
});
element("forget-saved").addEventListener("click", () => {
  if (!forgetAddress()) return;
  clearSchedule();
  input.value = "";
  error.hidden = true;
  status.textContent =
    "Saved address removed. Enter an address to start again.";
  input.focus();
});
renderSaved();
const savedAddress = remembered.read();
if (savedAddress) void choose(savedAddress);
