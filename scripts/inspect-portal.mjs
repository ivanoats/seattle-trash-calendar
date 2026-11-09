import console from "node:console";
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(
    "https://myutilities.seattle.gov/eportal/#/accountlookup/calendar",
  );
  await page
    .getByText("Street Address", { exact: false })
    .first()
    .waitFor({ timeout: 60000 });
  console.log(
    await page.locator("input").evaluateAll((nodes) =>
      nodes.map((n) => ({
        type: n.type,
        placeholder: n.placeholder,
        id: n.id,
      })),
    ),
  );
  console.log((await page.locator("body").innerText()).slice(-6000));
} finally {
  await browser.close();
}
