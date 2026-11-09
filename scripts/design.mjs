import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
await copyFile(
  fileURLToPath(
    import.meta.resolve("@sustainablewebsites/verdant-design/theme-toggle.js"),
  ),
  "public/verdant-theme-toggle.js",
);
