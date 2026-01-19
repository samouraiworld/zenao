#!/usr/bin/env tsx
/* eslint-disable no-restricted-syntax */

import { execSync } from "child_process";
import { resolve } from "path";
import { readFileSync, writeFileSync, readdirSync } from "fs";

// Parse command line arguments
const args = process.argv.slice(2);

interface Config {
  locales: string[];
  appName: string;
  localesPath: string;
  eslintConfig: string;
  fix: boolean;
}

const parseArgs = (): Config => {
  const config: Config = {
    locales: ["en", "fr"],
    appName: "Zenao",
    localesPath: "app/i18n/messages",
    eslintConfig: "packages/i18n-check/eslint.config.json.mjs",
    fix: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--locales":
        config.locales = args[++i].split(",");
        break;
      case "--app-name":
        config.appName = args[++i];
        break;
      case "--locales-path":
        config.localesPath = args[++i];
        break;
      case "--eslint-config":
        config.eslintConfig = args[++i];
        break;
      case "--fix":
        config.fix = true;
        break;
    }
  }

  return config;
};

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
} as const;

// ============================================================================
// CHECK 0: Lone Entries (t() keys in code that are missing from default language)
// ============================================================================

interface LoneEntriesResult {
  hasLoneEntries: boolean;
  loneEntries: string[];
}

interface UnusedKeysResult {
  hasUnusedKeys: boolean;
  unusedKeys: string[];
}

/**
 * Recursively extract all keys from a nested JSON object.
 */
const extractKeysFromJson = (obj: unknown, prefix = ""): string[] => {
  const keys: string[] = [];

  if (
    obj === null ||
    obj === undefined ||
    typeof obj !== "object" ||
    Array.isArray(obj)
  ) {
    return keys;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nestedKeys = extractKeysFromJson(value, fullKey);
      if (nestedKeys.length > 0) {
        keys.push(...nestedKeys);
      } else {
        keys.push(fullKey);
      }
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
};

/**
 * Check if a key looks like a valid i18n translation key.
 * Valid keys: at least 2 chars, starts with letter, contains only letters, numbers, dots, underscores.
 */
const isValidTranslationKey = (key: string): boolean => {
  // Must be at least 2 characters
  if (key.length < 2) return false;

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(key)) return false;

  // Must only contain valid characters (letters, numbers, dots, underscores, hyphens)
  if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(key)) return false;

  // Exclude common false positives (interpolation variable patterns)
  const falsePositives = new Set([
    "to",
    "from",
    "id",
    "key",
    "value",
    "name",
    "type",
    "data",
    "item",
    "index",
    "count",
    "total",
    "min",
    "max",
    "date",
    "time",
    "url",
    "src",
    "alt",
    "ref",
  ]);
  if (falsePositives.has(key.toLowerCase())) return false;

  return true;
};

/**
 * Strip comments from source code to avoid false positives.
 * Removes single-line comments (//) but NOT multi-line comments
 * (multi-line comment stripping is too risky due to /* in glob patterns)
 */
const stripComments = (code: string): string => {
  // Only remove single-line comments (// ...)
  // Skip lines where // is inside a string (after an odd number of quotes)
  // Simple heuristic: only strip // if it appears before any quote on the line
  return code
    .split("\n")
    .map((line) => {
      // Find // that's not inside a string
      // Simple approach: find // and check if there are quotes before it
      const commentIndex = line.indexOf("//");
      if (commentIndex === -1) return line;

      // Check if // is inside a string by counting quotes before it
      const beforeComment = line.substring(0, commentIndex);
      const singleQuotes = (beforeComment.match(/'/g) || []).length;
      const doubleQuotes = (beforeComment.match(/"/g) || []).length;
      const backticks = (beforeComment.match(/`/g) || []).length;

      // If any quote count is odd, // is likely inside a string
      if (
        singleQuotes % 2 !== 0 ||
        doubleQuotes % 2 !== 0 ||
        backticks % 2 !== 0
      ) {
        return line;
      }

      // Strip the comment
      return beforeComment;
    })
    .join("\n");
};

/**
 * Extract t() keys from source code.
 * Detects multiple patterns:
 * 1. Direct t("key") calls
 * 2. Template literals t(`prefix.${var}`) - extracts the static prefix
 * 3. Object properties ending in Key (titleKey, descriptionKey, etc.)
 * 4. Any string that looks like a translation key (namespace.path.key format)
 */
const extractKeysFromCode = (
  srcPaths: string[],
): {
  literalKeys: Set<string>;
  dynamicPrefixes: Set<string>;
} => {
  const literalKeys = new Set<string>();
  const dynamicPrefixes = new Set<string>();

  for (const srcPath of srcPaths) {
    try {
      // Read all source files and extract t() calls using proper regex
      // Get list of files first
      const filesOutput = execSync(
        `find "${srcPath}" -type f \\( -name "*.tsx" -o -name "*.ts" \\) 2>/dev/null || true`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
      );

      const files = filesOutput.split("\n").filter((f) => f.trim());

      for (const file of files) {
        try {
          const rawContent = readFileSync(file, "utf-8");
          // Strip comments to avoid false positives from commented-out code
          const content = stripComments(rawContent);

          // Match t("key"), getT("key"), i18n.t("key") patterns
          // Look for patterns: {t(, (t(, =t(, :t(, space+t(, >t(, [t(
          // Also match getT( and i18n.t( which are common wrappers
          // Allow whitespace (including newlines) after opening parenthesis for multiline calls
          const tMatches = content.matchAll(
            /(?:^|[{\s(=:>\[,])(?:t|getT|i18n\.t)\((?:\s|[\r\n])*["']([^"'\r\n]+)["']/gm,
          );

          for (const match of tMatches) {
            if (match[1] && isValidTranslationKey(match[1])) {
              literalKeys.add(match[1]);
            }
          }

          // Match template literals: t(`prefix.${var}`), getT(`prefix.${var}`), i18n.t(`prefix.${var}`)
          // Extract the static prefix before the first ${
          // Allow whitespace (including newlines) after opening parenthesis for multiline calls
          const templateMatches = content.matchAll(
            /(?:^|[{\s(=:>\[,])(?:t|getT|i18n\.t)\((?:\s|[\r\n])*`([^`$]+)\$\{/gm,
          );

          for (const match of templateMatches) {
            if (match[1]) {
              // Remove trailing dot if present
              const prefix = match[1].replace(/\.$/, "");
              if (prefix && isValidTranslationKey(prefix)) {
                dynamicPrefixes.add(prefix);
              }
            }
          }

          // Match any property ending in Key (titleKey, descriptionKey, labelKey, etc.)
          // This catches patterns like: titleKey: "some.translation.key"
          const keyPropertyMatches = content.matchAll(
            /\w+Key["']?\s*[:=]\s*["']([^"']+)["']/gm,
          );

          for (const match of keyPropertyMatches) {
            if (match[1] && isValidTranslationKey(match[1])) {
              literalKeys.add(match[1]);
            }
          }

          // Match property ending in Key with template literals: labelKey: `prefix.${var}`
          // Extract the static prefix before the first ${
          const keyPropertyTemplateMatches = content.matchAll(
            /\w+Key["']?\s*[:=]\s*`([^`$]+)\$\{/gm,
          );

          for (const match of keyPropertyTemplateMatches) {
            if (match[1]) {
              // Remove trailing dot if present
              const prefix = match[1].replace(/\.$/, "");
              if (prefix && isValidTranslationKey(prefix)) {
                dynamicPrefixes.add(prefix);
              }
            }
          }

          // Also match any string that looks like a translation key in arrays/objects
          // Pattern: "namespace.path.key" where it has at least one dot
          // This catches keys defined in config arrays like navItems
          // Require at least 2 parts (one dot) to reduce false positives
          const potentialKeyMatches = content.matchAll(
            /["']([a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9])["']/gm,
          );

          for (const match of potentialKeyMatches) {
            const key = match[1];
            // Skip common non-i18n patterns
            if (
              key &&
              isValidTranslationKey(key) &&
              !key.includes("__") && // Skip dunder patterns
              !key.match(/^[a-z]+\.[a-z]+$/) && // Skip simple two-word patterns like "app.tsx"
              !key.match(/\.(ts|tsx|js|jsx|json|css|svg|png|jpg)$/) && // Skip file extensions
              !key.match(/\.(com|org|net|eu|io|dev|app|co)$/) && // Skip domain TLDs
              !key.match(
                /\.(data|result|error|value|items|list|length|map|filter)$/,
              ) && // Skip common JS properties
              !key.startsWith("process.") &&
              !key.startsWith("import.") &&
              !key.startsWith("console.") &&
              !key.startsWith("window.") &&
              !key.startsWith("document.")
            ) {
              literalKeys.add(key);
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // If find fails for this path, continue to next
    }
  }

  return { literalKeys, dynamicPrefixes };
};

/**
 * Find t() keys used in code that are missing from the default language file (fr.json).
 * Uses grep to extract keys from source and compares with fr.json.
 */
const checkLoneEntries = (
  localesPath: string,
  defaultLanguage: string,
): LoneEntriesResult => {
  if (!localesPath) {
    return { hasLoneEntries: false, loneEntries: [] };
  }

  try {
    // Determine source path from locales path - for Zenao, source is in multiple directories
    const appPath = resolve(process.cwd(), "./", "app");
    const componentsPath = resolve(process.cwd(), "./", "components");
    const libPath = resolve(process.cwd(), "./", "lib");
    const hooksPath = resolve(process.cwd(), "./", "hooks");

    // Also search in backend directory for Go files (though this script focuses on TS/TSX)
    const backendPath = resolve(process.cwd(), "./", "backend");

    // Load default language JSON
    const defaultPath = resolve(
      process.cwd(),
      "./",
      localesPath,
      `${defaultLanguage}.json`,
    );
    const defaultContent = readFileSync(defaultPath, "utf-8");
    const defaultTranslations = JSON.parse(defaultContent) as Record<
      string,
      unknown
    >;
    const jsonKeys = new Set(extractKeysFromJson(defaultTranslations));

    // Extract keys from source code (app, components, lib, hooks directories)
    const { literalKeys } = extractKeysFromCode([
      appPath,
      componentsPath,
      libPath,
      hooksPath,
    ]);

    // Check if a key is a prefix of any JSON key (partial key used for dynamic composition)
    const isPrefixOfJsonKey = (key: string): boolean => {
      const prefix = key + ".";
      for (const jsonKey of jsonKeys) {
        if (jsonKey.startsWith(prefix)) {
          return true;
        }
      }
      return false;
    };

    // Find keys in code that are not in fr.json
    // Only report keys with at least one dot (namespace.key format)
    // Skip keys that are prefixes of actual JSON keys (partial keys for dynamic composition)
    const loneEntries = Array.from(literalKeys)
      .filter(
        (key) =>
          key.includes(".") && !jsonKeys.has(key) && !isPrefixOfJsonKey(key),
      )
      .sort();

    return {
      hasLoneEntries: loneEntries.length > 0,
      loneEntries,
    };
  } catch (error) {
    console.error(`Warning: Could not check lone entries: ${error}`);
    return { hasLoneEntries: false, loneEntries: [] };
  }
};

/**
 * Check if a key might be used dynamically via a template literal.
 * For example, if we have t(`adminPage.days.${day}`), then
 * adminPage.days.monday, adminPage.days.tuesday, etc. should not be marked as unused.
 */
const isKeyUsedDynamically = (
  key: string,
  dynamicPrefixes: Set<string>,
): boolean => {
  for (const prefix of dynamicPrefixes) {
    if (key.startsWith(prefix + ".")) {
      return true;
    }
  }
  return false;
};

/**
 * Check if a key is a pluralization variant of a used key.
 * i18next uses suffixes like _one, _other, _zero, _two, _few, _many for pluralization.
 * If code uses t("key", { count: n }), i18next looks for key_one, key_other, etc.
 */
const isPluralVariant = (key: string, literalKeys: Set<string>): boolean => {
  const pluralSuffixes = ["_one", "_other", "_zero", "_two", "_few", "_many"];
  for (const suffix of pluralSuffixes) {
    if (key.endsWith(suffix)) {
      const baseKey = key.slice(0, -suffix.length);
      // Check if the base key or any other plural variant is used
      if (literalKeys.has(baseKey)) {
        return true;
      }
      // Also check if another plural variant is used (e.g., _one is used, so _other is valid)
      for (const otherSuffix of pluralSuffixes) {
        if (literalKeys.has(baseKey + otherSuffix)) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * Find keys that exist in the default language file (fr.json) but are never used in code.
 * These are "dead" translation keys that can potentially be removed.
 * Keys that might be used dynamically (via template literals) are excluded.
 */
const checkUnusedKeys = (
  localesPath: string,
  defaultLanguage: string,
): UnusedKeysResult => {
  if (!localesPath) {
    return { hasUnusedKeys: false, unusedKeys: [] };
  }

  try {
    // Determine source path from locales path - for Zenao, source is in multiple directories
    const appPath = resolve(process.cwd(), "./", "app");
    const componentsPath = resolve(process.cwd(), "./", "components");
    const libPath = resolve(process.cwd(), "./", "lib");
    const hooksPath = resolve(process.cwd(), "./", "hooks");

    // Load default language JSON
    const defaultPath = resolve(
      process.cwd(),
      "./",
      localesPath,
      `${defaultLanguage}.json`,
    );
    const defaultContent = readFileSync(defaultPath, "utf-8");
    const defaultTranslations = JSON.parse(defaultContent) as Record<
      string,
      unknown
    >;
    const jsonKeys = extractKeysFromJson(defaultTranslations);

    // Extract keys from source code (app, components, lib, hooks directories)
    const { literalKeys, dynamicPrefixes } = extractKeysFromCode([
      appPath,
      componentsPath,
      libPath,
      hooksPath,
    ]);

    // Find keys in JSON that are not used in code
    // Exclude keys that might be used dynamically or are pluralization variants
    const unusedKeys = jsonKeys
      .filter(
        (key) =>
          !literalKeys.has(key) &&
          !isKeyUsedDynamically(key, dynamicPrefixes) &&
          !isPluralVariant(key, literalKeys),
      )
      .sort();

    return {
      hasUnusedKeys: unusedKeys.length > 0,
      unusedKeys,
    };
  } catch (error) {
    console.error(`Warning: Could not check unused keys: ${error}`);
    return { hasUnusedKeys: false, unusedKeys: [] };
  }
};

/**
 * Remove a key from a nested JSON object.
 * Key format: "namespace.subkey.value" -> removes obj.namespace.subkey.value
 * Also cleans up empty parent objects after removal.
 */
const removeKeyFromObject = (
  obj: Record<string, unknown>,
  keyPath: string,
): boolean => {
  const parts = keyPath.split(".");

  if (parts.length === 1) {
    if (keyPath in obj) {
      delete obj[keyPath];
      return true;
    }
    return false;
  }

  const [first, ...rest] = parts;
  const child = obj[first];

  if (child && typeof child === "object" && !Array.isArray(child)) {
    const removed = removeKeyFromObject(
      child as Record<string, unknown>,
      rest.join("."),
    );

    // Clean up empty parent objects
    if (removed && Object.keys(child).length === 0) {
      delete obj[first];
    }

    return removed;
  }

  return false;
};

/**
 * Remove unused keys from all locale files in the given directory.
 */
const removeUnusedKeysFromLocales = (
  localesPath: string,
  unusedKeys: string[],
): { locale: string; removed: number }[] => {
  const results: { locale: string; removed: number }[] = [];

  if (!localesPath || unusedKeys.length === 0) {
    return results;
  }

  try {
    const fullLocalesPath = resolve(process.cwd(), "./", localesPath);
    const files = readdirSync(fullLocalesPath).filter((f) =>
      f.endsWith(".json"),
    );

    for (const file of files) {
      const filePath = resolve(fullLocalesPath, file);
      const locale = file.replace(".json", "");

      try {
        const content = readFileSync(filePath, "utf-8");
        const translations = JSON.parse(content) as Record<string, unknown>;

        let removedCount = 0;
        for (const key of unusedKeys) {
          if (removeKeyFromObject(translations, key)) {
            removedCount++;
          }
        }

        if (removedCount > 0) {
          // Write back with pretty formatting (2 spaces, trailing newline)
          writeFileSync(
            filePath,
            JSON.stringify(translations, null, 2) + "\n",
            "utf-8",
          );
        }

        results.push({ locale, removed: removedCount });
      } catch (error) {
        console.error(`Warning: Could not process ${file}: ${error}`);
      }
    }
  } catch (error) {
    console.error(`Warning: Could not read locales directory: ${error}`);
  }

  return results;
};

// ============================================================================
// CHECK 1: Duplicate Keys in JSON
// ============================================================================

interface DuplicateKeysResult {
  hasDuplicates: boolean;
  errors: string[];
}

const checkDuplicateKeys = (
  localesPath: string,
  eslintConfig: string,
): DuplicateKeysResult => {
  if (!localesPath || !eslintConfig) {
    return { hasDuplicates: false, errors: [] };
  }

  try {
    execSync(
      `ESLINT_USE_FLAT_CONFIG=true node_modules/@repo/i18n-check/node_modules/.bin/eslint --config ${eslintConfig} ${localesPath}/*.json`,
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        cwd: resolve(process.cwd(), "./"),
      },
    );
    return { hasDuplicates: false, errors: [] };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    const output = execError.stdout || execError.stderr || "";
    const errors: string[] = [];

    // Parse ESLint output for duplicate key errors
    const lines = output.split("\n");
    for (const line of lines) {
      if (line.includes("Duplicate key")) {
        errors.push(line.trim());
      }
    }

    return { hasDuplicates: errors.length > 0, errors };
  }
};

// ============================================================================
// CHECK 2: Hardcoded Strings
// ============================================================================

interface HardcodedString {
  line: number;
  message: string;
}

interface HardcodedResult {
  hasHardcoded: boolean;
  count: number;
  files: { file: string; strings: HardcodedString[] }[];
}

/**
 * JSX attributes that should be internationalized.
 * Hardcoded strings in these attributes will be flagged.
 */
const I18N_ATTRIBUTES = [
  "placeholder",
  "title",
  "alt",
  "aria-label",
  "aria-placeholder",
  "aria-description",
  "label",
];

/**
 * Check for hardcoded strings in JSX attributes.
 * Scans source files for attributes like placeholder="hardcoded text"
 * that should use t() for translations.
 */
const checkHardcodedJsxAttributes = (localesPath: string): HardcodedResult => {
  const fileMap: Record<string, HardcodedString[]> = {};
  let totalCount = 0;

  if (!localesPath) {
    return { hasHardcoded: false, count: 0, files: [] };
  }

  try {
    // For Zenao, check multiple source directories
    const sourcePaths = [
      resolve(process.cwd(), "./", "app"),
      resolve(process.cwd(), "./", "components"),
      resolve(process.cwd(), "./", "lib"),
      resolve(process.cwd(), "./", "hooks"),
    ];

    // Get all source files from all directories
    const allFiles: string[] = [];
    for (const srcPath of sourcePaths) {
      try {
        const filesOutput = execSync(
          `find "${srcPath}" -type f \\( -name "*.tsx" -o -name "*.jsx" \\) 2>/dev/null || true`,
          { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
        );
        const files = filesOutput.split("\n").filter((f) => f.trim());
        allFiles.push(...files);
      } catch {
        // Skip directories that don't exist
      }
    }

    // Build regex pattern for matching hardcoded attribute values
    // Matches: attribute="string" or attribute={'string'} or attribute={"string"}
    const attrPattern = I18N_ATTRIBUTES.map((attr) =>
      attr.replace(/-/g, "\\-"),
    ).join("|");
    const hardcodedRegex = new RegExp(
      `(${attrPattern})\\s*=\\s*(?:"([^"]{3,})"|'([^']{3,})'|\\{\\s*["']([^"']{3,})["']\\s*\\})`,
      "g",
    );

    for (const file of allFiles) {
      try {
        const content = readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match;

          // Reset regex lastIndex for each line
          hardcodedRegex.lastIndex = 0;

          while ((match = hardcodedRegex.exec(line)) !== null) {
            const attrName = match[1];
            const value = match[2] || match[3] || match[4];

            // Skip if value looks like a variable or expression
            if (!value || value.includes("${") || value.startsWith("t(")) {
              continue;
            }

            // Skip numeric placeholders (format hints like "0.0", "0", "00:00")
            if (value.match(/^[0-9.:]+$/)) {
              continue;
            }

            // Skip URLs, file paths, CSS classes
            if (
              value.startsWith("http") ||
              value.startsWith("/") ||
              value.startsWith(".") ||
              value.includes("://") ||
              value.match(/\.(png|jpg|svg|css|js)$/)
            ) {
              continue;
            }

            // This looks like a hardcoded translatable string
            const relativePath = file.replace(process.cwd() + "/", "");
            if (!fileMap[relativePath]) {
              fileMap[relativePath] = [];
            }

            fileMap[relativePath].push({
              line: i + 1,
              message: `Hardcoded ${attrName}: "${value.substring(0, 50)}${value.length > 50 ? "..." : ""}"`,
            });
            totalCount++;
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  } catch (error) {
    console.error(
      `Warning: Could not check hardcoded JSX attributes: ${error}`,
    );
  }

  // Convert to array format
  const files = Object.entries(fileMap)
    .filter(([, strings]) => strings.length > 0)
    .map(([file, strings]) => ({
      file,
      strings: strings.sort((a, b) => a.line - b.line),
    }))
    .sort((a, b) => b.strings.length - a.strings.length);

  return {
    hasHardcoded: totalCount > 0,
    count: totalCount,
    files,
  };
};

const checkHardcodedStrings = (localesPath: string): HardcodedResult => {
  // First check with i18next-cli lint
  let i18nextResult: HardcodedResult = {
    hasHardcoded: false,
    count: 0,
    files: [],
  };

  try {
    const output = execSync("npx i18next-cli lint", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!output.includes("No issues found")) {
      i18nextResult = parseHardcodedOutput(output);
    }
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    const output = execError.stdout || execError.stderr || "";

    if (!output.includes("No issues found")) {
      i18nextResult = parseHardcodedOutput(output);
    }
  }

  // Then check for hardcoded JSX attributes
  const jsxAttrResult = checkHardcodedJsxAttributes(localesPath);

  // Merge results
  const mergedFiles = [...i18nextResult.files];

  for (const jsxFile of jsxAttrResult.files) {
    const existing = mergedFiles.find((f) => f.file === jsxFile.file);
    if (existing) {
      existing.strings.push(...jsxFile.strings);
      existing.strings.sort((a, b) => a.line - b.line);
    } else {
      mergedFiles.push(jsxFile);
    }
  }

  return {
    hasHardcoded: i18nextResult.hasHardcoded || jsxAttrResult.hasHardcoded,
    count: i18nextResult.count + jsxAttrResult.count,
    files: mergedFiles.sort((a, b) => b.strings.length - a.strings.length),
  };
};

const parseHardcodedOutput = (output: string): HardcodedResult => {
  const fileMap: Record<string, HardcodedString[]> = {};
  let totalCount = 0;

  // Parse the linter output to extract all hardcoded strings with their locations
  const lines = output.split("\n");
  let currentFile: string | null = null;

  for (const line of lines) {
    // Match lines like "src/components/Foo.tsx" or file paths
    const fileMatch = line.match(/^(src\/[^\s:]+\.(tsx?|jsx?))$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      if (!fileMap[currentFile]) {
        fileMap[currentFile] = [];
      }
      continue;
    }

    // Match error lines with line numbers and messages
    // Format: "  123: Error: Hardcoded string: 'Some text here'"
    const errorMatch = line.match(/^\s*(\d+):\s*Error:\s*(.+)$/);
    if (errorMatch && currentFile) {
      const lineNumber = parseInt(errorMatch[1], 10);
      const message = errorMatch[2].trim();

      fileMap[currentFile].push({
        line: lineNumber,
        message,
      });
      totalCount++;
    }
  }

  // Also try to get total from summary line
  const summaryMatch = output.match(/Linter found (\d+) potential issues/);
  if (summaryMatch) {
    totalCount = parseInt(summaryMatch[1], 10);
  }

  // Convert to array format
  const files = Object.entries(fileMap)
    .filter(([, strings]) => strings.length > 0)
    .map(([file, strings]) => ({
      file,
      strings: strings.sort((a, b) => a.line - b.line),
    }))
    .sort((a, b) => b.strings.length - a.strings.length);

  return {
    hasHardcoded: totalCount > 0,
    count: totalCount,
    files,
  };
};

// ============================================================================
// CHECK 3: Missing Translations
// ============================================================================

interface MissingResult {
  locale: string;
  missing: string[];
  total: number;
  found: number;
}

const checkMissingTranslations = (locales: string[]): MissingResult[] => {
  const results: MissingResult[] = [];

  for (const locale of locales) {
    try {
      const output = execSync(`npx i18next-cli status ${locale}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      results.push(parseMissingOutput(locale, output));
    } catch (error: unknown) {
      const execError = error as { stdout?: string };
      results.push(parseMissingOutput(locale, execError.stdout || ""));
    }
  }

  return results;
};

const parseMissingOutput = (locale: string, output: string): MissingResult => {
  const lines = output.split("\n");
  const missing: string[] = [];

  for (const line of lines) {
    if (line.includes("✗")) {
      const key = line.replace(/.*✗\s*/, "").trim();
      if (key) {
        missing.push(key);
      }
    }
  }

  const progressMatch = output.match(/(\d+)\/(\d+)\s*keys?\)/);
  const found = progressMatch ? parseInt(progressMatch[1], 10) : 0;
  const total = progressMatch ? parseInt(progressMatch[2], 10) : 0;

  return { locale, missing, total, found };
};

// ============================================================================
// REPORT GENERATION
// ============================================================================

const generateReport = (
  appName: string,
  loneEntriesResult: LoneEntriesResult,
  unusedKeysResult: UnusedKeysResult,
  duplicateResult: DuplicateKeysResult,
  hardcodedResult: HardcodedResult,
  missingResults: MissingResult[],
): string => {
  const lines: string[] = [];
  let hasErrors = false;

  // Header
  lines.push("");
  lines.push(`${colors.blue}${"═".repeat(80)}${colors.reset}`);
  lines.push(
    `${colors.blue}${colors.bold}  📋 i18n Report: ${appName}${colors.reset}`,
  );
  lines.push(`${colors.blue}${"═".repeat(80)}${colors.reset}`);
  lines.push("");

  // Section 0: Lone Entries (t() keys in code missing from default language)
  lines.push(
    `${colors.cyan}${colors.bold}  0. Lone Entries (in code, missing from EN)${colors.reset}`,
  );
  lines.push(`${colors.cyan}  ${"─".repeat(40)}${colors.reset}`);
  if (loneEntriesResult.hasLoneEntries) {
    hasErrors = true;
    lines.push(
      `     ${colors.red}❌ Found ${loneEntriesResult.loneEntries.length} lone entry/entries${colors.reset}`,
    );
    lines.push(
      `     ${colors.dim}(t() keys used in code but missing from en.json)${colors.reset}`,
    );

    // Group by namespace (compact)
    const grouped: Record<string, string[]> = {};
    for (const key of loneEntriesResult.loneEntries) {
      const parts = key.split(".");
      const namespace = parts.length > 1 ? parts[0] : "_root";
      if (!grouped[namespace]) {
        grouped[namespace] = [];
      }
      grouped[namespace].push(key);
    }

    const sortedNamespaces = Object.keys(grouped).sort();
    for (const namespace of sortedNamespaces) {
      const namespaceKeys = grouped[namespace].sort();
      const displayKeys = namespaceKeys.map((k) =>
        k.startsWith(namespace + ".") ? k.slice(namespace.length + 1) : k,
      );
      lines.push(
        `        ${colors.dim}[${namespace}]${colors.reset} ${displayKeys.join(", ")}`,
      );
    }
  } else {
    lines.push(`     ${colors.green}✅ No lone entries found${colors.reset}`);
  }
  lines.push("");

  // Section 1: Unused Keys (in en.json but not used in code)
  lines.push(
    `${colors.cyan}${colors.bold}  1. Unused Keys (in EN, not used in code)${colors.reset}`,
  );
  lines.push(`${colors.cyan}  ${"─".repeat(40)}${colors.reset}`);
  if (unusedKeysResult.hasUnusedKeys) {
    // Note: Unused keys are a warning, not a blocking error
    lines.push(
      `     ${colors.yellow}⚠️  Found ${unusedKeysResult.unusedKeys.length} unused key(s)${colors.reset}`,
    );
    lines.push(
      `     ${colors.dim}(keys in en.json but never used in code - consider removing)${colors.reset}`,
    );

    // Group by namespace (compact)
    const grouped: Record<string, string[]> = {};
    for (const key of unusedKeysResult.unusedKeys) {
      const parts = key.split(".");
      const namespace = parts.length > 1 ? parts[0] : "_root";
      if (!grouped[namespace]) {
        grouped[namespace] = [];
      }
      grouped[namespace].push(key);
    }

    const sortedNamespaces = Object.keys(grouped).sort();
    for (const namespace of sortedNamespaces) {
      const namespaceKeys = grouped[namespace].sort();
      const displayKeys = namespaceKeys.map((k) =>
        k.startsWith(namespace + ".") ? k.slice(namespace.length + 1) : k,
      );
      lines.push(
        `        ${colors.dim}[${namespace}]${colors.reset} ${displayKeys.join(", ")}`,
      );
    }
  } else {
    lines.push(`     ${colors.green}✅ No unused keys found${colors.reset}`);
  }
  lines.push("");

  // Section 2: Duplicate Keys
  lines.push(
    `${colors.cyan}${colors.bold}  2. Duplicate Keys in Locale Files${colors.reset}`,
  );
  lines.push(`${colors.cyan}  ${"─".repeat(40)}${colors.reset}`);
  if (duplicateResult.hasDuplicates) {
    hasErrors = true;
    lines.push(
      `     ${colors.red}❌ Found ${duplicateResult.errors.length} duplicate key(s)${colors.reset}`,
    );
    for (const err of duplicateResult.errors.slice(0, 5)) {
      lines.push(`        ${colors.dim}${err}${colors.reset}`);
    }
    if (duplicateResult.errors.length > 5) {
      lines.push(
        `        ${colors.dim}... and ${duplicateResult.errors.length - 5} more${colors.reset}`,
      );
    }
  } else {
    lines.push(`     ${colors.green}✅ No duplicate keys found${colors.reset}`);
  }
  lines.push("");

  // Section 3: Hardcoded Strings
  lines.push(
    `${colors.cyan}${colors.bold}  3. Hardcoded Strings${colors.reset}`,
  );
  lines.push(`${colors.cyan}  ${"─".repeat(40)}${colors.reset}`);
  if (hardcodedResult.hasHardcoded) {
    hasErrors = true;
    lines.push(
      `     ${colors.red}❌ Found ${hardcodedResult.count} hardcoded string(s)${colors.reset}`,
    );
    if (hardcodedResult.files.length > 0) {
      lines.push("");
      for (const { file, strings } of hardcodedResult.files) {
        lines.push(
          `     ${colors.dim}${file} (${strings.length})${colors.reset}`,
        );
        for (const { line, message } of strings) {
          lines.push(
            `        ${colors.dim}Line ${line}:${colors.reset} ${message}`,
          );
        }
        lines.push("");
      }
    }
  } else {
    lines.push(
      `     ${colors.green}✅ No hardcoded strings found${colors.reset}`,
    );
  }
  lines.push("");

  // Section 4: Missing Translations
  lines.push(
    `${colors.cyan}${colors.bold}  4. Missing Translations${colors.reset}`,
  );
  lines.push(`${colors.cyan}  ${"─".repeat(40)}${colors.reset}`);

  for (const result of missingResults) {
    const { locale, missing, total, found } = result;

    if (missing.length === 0) {
      const progress = total > 0 ? ` (${found}/${total} keys)` : "";
      lines.push(
        `     ${colors.green}✅ ${locale.toUpperCase()}${colors.reset}: Complete${colors.dim}${progress}${colors.reset}`,
      );
    } else {
      hasErrors = true;
      const percentage =
        total > 0 ? ` ${Math.round((found / total) * 100)}%` : "";
      lines.push(
        `     ${colors.red}❌ ${locale.toUpperCase()}${colors.reset}: ${missing.length} missing${colors.dim}${percentage}${colors.reset}`,
      );

      // Group by namespace (compact)
      const grouped: Record<string, string[]> = {};
      for (const key of missing) {
        const parts = key.split(".");
        const namespace = parts.length > 1 ? parts[0] : "_root";
        if (!grouped[namespace]) {
          grouped[namespace] = [];
        }
        grouped[namespace].push(key);
      }

      const sortedNamespaces = Object.keys(grouped).sort();
      for (const namespace of sortedNamespaces) {
        const keys = grouped[namespace].sort();
        const displayKeys = keys.map((k) =>
          k.startsWith(namespace + ".") ? k.slice(namespace.length + 1) : k,
        );
        lines.push(
          `        ${colors.dim}[${namespace}]${colors.reset} ${displayKeys.join(", ")}`,
        );
      }
    }
  }
  lines.push("");

  // Footer
  lines.push(`${colors.blue}${"═".repeat(80)}${colors.reset}`);
  if (hasErrors) {
    lines.push(
      `${colors.red}${colors.bold}  ❌ ${appName}: Issues found - please fix before merging${colors.reset}`,
    );
  } else {
    lines.push(
      `${colors.green}${colors.bold}  ✅ ${appName}: All i18n checks passed!${colors.reset}`,
    );
  }
  lines.push(`${colors.blue}${"═".repeat(80)}${colors.reset}`);
  lines.push("");

  return lines.join("\n");
};

// ============================================================================
// MAIN
// ============================================================================

const main = (): void => {
  const config = parseArgs();

  // Run all checks
  // Check 0: Lone entries (t() keys in code missing from default language)
  const defaultLanguage = "en"; // English is the default/primary language
  const loneEntriesResult = checkLoneEntries(
    config.localesPath,
    defaultLanguage,
  );

  // Check 1: Unused keys (keys in default language but not used in code)
  const unusedKeysResult = checkUnusedKeys(config.localesPath, defaultLanguage);

  const duplicateResult = checkDuplicateKeys(
    config.localesPath,
    config.eslintConfig,
  );
  const hardcodedResult = checkHardcodedStrings(config.localesPath);
  const missingResults = checkMissingTranslations(config.locales);

  // Generate and output report
  const report = generateReport(
    config.appName,
    loneEntriesResult,
    unusedKeysResult,
    duplicateResult,
    hardcodedResult,
    missingResults,
  );
  console.log(report);

  // If --fix is passed, remove unused keys from all locale files
  if (config.fix && unusedKeysResult.hasUnusedKeys) {
    console.log(
      `${colors.blue}${colors.bold}  🔧 Removing unused keys...${colors.reset}`,
    );
    console.log("");

    const removalResults = removeUnusedKeysFromLocales(
      config.localesPath,
      unusedKeysResult.unusedKeys,
    );

    for (const { locale, removed } of removalResults) {
      if (removed > 0) {
        console.log(
          `     ${colors.green}✅ ${locale.toUpperCase()}${colors.reset}: Removed ${removed} unused key(s)`,
        );
      } else {
        console.log(
          `     ${colors.dim}${locale.toUpperCase()}: No keys to remove${colors.reset}`,
        );
      }
    }

    console.log("");
    console.log(
      `${colors.green}${colors.bold}  ✨ Done! ${unusedKeysResult.unusedKeys.length} unused key(s) removed from locale files.${colors.reset}`,
    );
    console.log("");
  }

  // Determine exit code
  const hasMissing = missingResults.some((r) => r.missing.length > 0);
  const hasErrors =
    loneEntriesResult.hasLoneEntries ||
    duplicateResult.hasDuplicates ||
    hardcodedResult.hasHardcoded ||
    hasMissing;

  process.exit(hasErrors ? 1 : 0);
};

main();
