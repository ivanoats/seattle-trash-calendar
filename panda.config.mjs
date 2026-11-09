import { defineConfig } from "@pandacss/dev";
import { verdantPreset } from "@sustainablewebsites/verdant-design";
export default defineConfig({
  preflight: true,
  presets: ["@pandacss/dev/presets", verdantPreset],
  include: ["./src/**/*.{ts,js}"],
  outdir: "styled-system",
});
