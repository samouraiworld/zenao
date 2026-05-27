import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import kebabCaseFilename from "./eslint-rules/kebab-case-filename.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      local: {
        rules: {
          "kebab-case-filename": kebabCaseFilename,
        },
      },
    },
    rules: {
      "local/kebab-case-filename": 2,
    },
  },
  ...compat.config({
    ignorePatterns: ["app/gen/*"],
    extends: [
      "next/core-web-vitals",
      "next/typescript",
      "plugin:prettier/recommended",
    ],
    rules: {
      "react-hooks/rules-of-hooks": "error", // Checks rules of Hooks
      "react-hooks/exhaustive-deps": "error", // Checks effect dependencies
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "prettier/prettier": "error",
      "import/order": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],
      "no-fallthrough": "error",
      "no-restricted-syntax": [
        "error",
        {
          message:
            "Do not use JSON.parse, it breaks type safety, use sanitization utils instead",
          selector:
            "MemberExpression[object.name='JSON'][property.name='parse']",
        },
      ],
    },
  }),
];

export default eslintConfig;
