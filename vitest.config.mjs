import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{js,mjs}"],
    fileParallelism: false,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
