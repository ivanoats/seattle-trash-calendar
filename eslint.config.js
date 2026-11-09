import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "styled-system/**",
      "public/verdant-theme-toggle.js",
      "worker-configuration.d.ts",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".wrangler/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["../adapters/*", "../application/*", "node:*"] },
      ],
    },
  },
);
