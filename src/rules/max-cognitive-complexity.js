import { analyzeCognitiveComplexity } from "../analyzer.js";

const DEFAULT_MAX = 15;

export const maxCognitiveComplexityRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Limit the cognitive complexity of functions.",
      recommended: false,
    },
    schema: [
      {
        oneOf: [
          {
            type: "number",
            minimum: 0,
          },
          {
            type: "object",
            additionalProperties: false,
            properties: {
              max: {
                type: "number",
                minimum: 0,
              },
              threshold: {
                type: "number",
                minimum: 0,
              },
              includeNestedFunctions: {
                type: "boolean",
              },
            },
          },
        ],
      },
    ],
    messages: {
      tooComplex:
        "{{name}} has a cognitive complexity of {{actual}}. Maximum allowed is {{max}}.",
    },
  },
  createOnce(context) {
    return {
      Program(node) {
        const { max, analyzeOptions } = normalizeOptions(context.options ?? []);
        const results = analyzeCognitiveComplexity(node, analyzeOptions);

        for (const result of results) {
          if (result.complexity <= max) {
            continue;
          }

          context.report({
            node: result.node,
            messageId: "tooComplex",
            data: {
              name: result.name === "<anonymous>" ? "This function" : `Function '${result.name}'`,
              actual: String(result.complexity),
              max: String(max),
            },
          });
        }
      },
    };
  },
};

function normalizeOptions(options) {
  const firstOption = options[0];

  if (typeof firstOption === "number") {
    return {
      max: firstOption,
      analyzeOptions: {},
    };
  }

  if (isPlainObject(firstOption)) {
    const max = numberOrUndefined(firstOption.max) ?? numberOrUndefined(firstOption.threshold) ?? DEFAULT_MAX;
    return {
      max,
      analyzeOptions: {
        includeNestedFunctions:
          typeof firstOption.includeNestedFunctions === "boolean"
            ? firstOption.includeNestedFunctions
            : undefined,
      },
    };
  }

  return {
    max: DEFAULT_MAX,
    analyzeOptions: {},
  };
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrUndefined(value) {
  return typeof value === "number" ? value : undefined;
}
