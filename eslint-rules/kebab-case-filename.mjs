import path from "node:path";

function isKebabCase(name) {
  return /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)?$/.test(name);
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "enforce kebab-case file names",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;

    if (filename === "<input>" || filename.includes("<")) {
      return {};
    }

    const base = path.basename(filename);

    if (!isKebabCase(base)) {
      context.report({
        loc: { line: 1, column: 0 },
        message: `Filename "{{name}}" is not kebab-case.`,
        data: { name: base },
      });
    }

    return {};
  },
};

export default rule;
