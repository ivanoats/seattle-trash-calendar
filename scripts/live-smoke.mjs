import console from "node:console";
import process from "node:process";
import { chromium, expect } from "@playwright/test";
import ICAL from "ical.js";
import { readFile } from "node:fs/promises";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  page.setDefaultTimeout(60000);
  await page.goto(process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:5173");
  await page.getByLabel("Street address", { exact: true }).fill("600 4th Ave");
  const search = page.waitForResponse((r) =>
    r.url().endsWith("/api/addresses"),
  );
  await page.getByRole("button", { name: "Find address", exact: true }).click();
  expect((await search).status()).toBe(200);
  const result = page.waitForResponse((r) => r.url().endsWith("/api/schedule"));
  await page.locator("#addresses button").first().click();
  const response = await result;
  expect(response.status()).toBe(200);
  const schedule = await response.json();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .ics calendar" }).click();
  const file = await (await downloading).path();
  const text = await readFile(file, "utf8");
  const events = new ICAL.Component(ICAL.parse(text)).getAllSubcomponents(
    "vevent",
  );
  expect(events).toHaveLength(schedule.collections.length);
  expect(text).not.toMatch(/accountNumber|access_token|personId/);
  const actual = events.map((c) => {
    const e = new ICAL.Event(c);
    return `${e.startDate.toString()}:${e.summary.replace(/ pickup$/, "")}`;
  });
  expect(actual).toEqual(
    schedule.collections.map((c) => `${c.date}:${c.service}`),
  );
  console.log(
    JSON.stringify({
      events: events.length,
      first: actual[0],
      last: actual.at(-1),
    }),
  );
  await page.screenshot({
    path: "/tmp/seattle-pickup-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/seattle-pickup-mobile.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}
