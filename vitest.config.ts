import { defineConfig, defaultExclude } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: "./.coverage",
      reporter: ["text", "lcov"],
    },
    exclude: ["build/**", ...defaultExclude],
  },
});
