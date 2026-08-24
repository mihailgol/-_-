import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    pool: "forks",
    forks: {
      singleFork: true,
    },
    include: ["tests/unit/**/*.test.{js,mjs}"],
    fileParallelism: false,
    maxConcurrency: 1,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
