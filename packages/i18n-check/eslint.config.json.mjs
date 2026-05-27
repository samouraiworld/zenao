// ESLint flat configuration for JSON files (i18n locales)
// Detects duplicate keys in translation JSON files
import json from "@eslint/json";

export default [
  {
    plugins: {
      json,
    },
  },
  {
    files: ["**/*.json"],
    language: "json/json",
    rules: {
      "json/no-duplicate-keys": "error",
    },
  },
];
