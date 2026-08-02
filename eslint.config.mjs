import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/", "test-results/", "playwright-report/", "js/lucide.min.js", "coverage/", ".serena/"],
  },

  js.configs.recommended,

  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-undef": "error",
    },
  },

  {
    files: ["server/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["tests/unit/**/*.test.js", "tests/unit/**/*.test.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["tests/e2e/**/*.spec.js", "playwright.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  eslintConfigPrettier,
];
