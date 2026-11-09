import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import ICAL from "ical.js";
import { schedule, addresses } from "../fixtures";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/addresses", (route) =>
    route.fulfill({ json: { addresses } }),
  );
  await page.route("**/api/schedule", (route) =>
    route.fulfill({ json: schedule }),
  );
  await page.goto("/");
});
test("search, choose, filter and download a valid calendar", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByLabel("Street address", { exact: true }).fill("600 4th Ave");
  await page.getByRole("button", { name: "Find address", exact: true }).click();
  await page
    .getByRole("button", { name: addresses[0].label, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download .ics calendar" }),
  ).toBeEnabled();
  await page.getByLabel("Garbage", { exact: true }).uncheck();
  await page.getByLabel("Food/Yard Waste", { exact: true }).uncheck();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .ics calendar" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("seattle-pickup.ics");
  const text = await readFile((await download.path())!, "utf8");
  const events = new ICAL.Component(ICAL.parse(text)).getAllSubcomponents(
    "vevent",
  );
  expect(events).toHaveLength(2);
  expect(text).toContain("SUMMARY:Recycle pickup");
  expect(text).not.toContain("SUMMARY:Garbage pickup");
  await page.getByLabel("Recycle", { exact: true }).uncheck();
  await expect(
    page.getByRole("button", { name: "Download .ics calendar" }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel("Street address", { exact: true }).fill("new address");
  await expect(
    page.getByRole("button", { name: "Download .ics calendar" }),
  ).toBeHidden();
});
test("empty state is accessible and has no horizontal overflow", async ({
  page,
}) => {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("handles no matches and upstream outages", async ({ page }) => {
  await page.route("**/api/addresses", (route) =>
    route.fulfill({ json: { addresses: [] } }),
  );
  await page.getByLabel("Street address", { exact: true }).fill("unknown");
  await page.getByRole("button", { name: "Find address", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No active");
  await page.route("**/api/addresses", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "Seattle lookup unavailable" },
    }),
  );
  await page.getByRole("button", { name: "Find address", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Seattle lookup unavailable",
  );
});

test("the local proxy preserves same-origin POST requests", async ({
  page,
}) => {
  await page.unroute("**/api/addresses");
  const response = await page.evaluate(async () => {
    const r = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "a" }),
    });
    return { status: r.status, body: await r.json() };
  });
  expect(response.status).toBe(400);
  expect(response.body.error).toContain("between 3 and 160");
});

test("Verdant themes follow system preferences and persist an explicit choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-resolved",
    "dark",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-override",
    "light",
  );
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Light", exact: true }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-resolved",
    "light",
  );
  await page.getByRole("radio", { name: "System", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-resolved",
    "dark",
  );
  await page.emulateMedia({ contrast: "more" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
