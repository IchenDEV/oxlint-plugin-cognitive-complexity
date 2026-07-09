import { eslintCompatPlugin } from "@oxlint/plugins";
import { maxCognitiveComplexityRule } from "./src/rules/max-cognitive-complexity.js";

export { analyzeCognitiveComplexity } from "./src/analyzer.js";
export { maxCognitiveComplexityRule } from "./src/rules/max-cognitive-complexity.js";

export const rules = {
  "max-cognitive-complexity": maxCognitiveComplexityRule,
};

export default eslintCompatPlugin({
  meta: {
    name: "cognitive-complexity",
    version: "0.1.0",
  },
  rules,
});
