import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/domain/**/*.ts",
        "src/application/**/*.ts",
        "src/adapters/**/*.ts",
      ],
      exclude: ["src/adapters/node.ts", "src/adapters/worker.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
