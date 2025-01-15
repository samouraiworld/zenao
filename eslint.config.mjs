import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    ignorePatterns: ["app/api/*"],
    extends: [
      "next/core-web-vitals",
      "next/typescript",
      "plugin:prettier/recommended",
    ],
    rules: {
      "react-hooks/rules-of-hooks": "error", // Checks rules of Hooks
      "react-hooks/exhaustive-deps": "error", // Checks effect dependencies
      "@typescript-eslint/no-unused-vars": "error",
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
            "Do not use StyleSheet.create, it breaks type safety and allows for dead code.\nNo it's not faster, see https://stackoverflow.com/a/56219676\nIf you want to declare constant styles for memoized components, use something like `const myStyle: ViewStyle = { ... }`",
          selector:
            "MemberExpression[object.name='StyleSheet'][property.name='create']",
        },
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
