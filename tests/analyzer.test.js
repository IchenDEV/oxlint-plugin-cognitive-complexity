import { parse } from "@typescript-eslint/parser";
import { describe, expect, it } from "vitest";
import { analyzeCognitiveComplexity } from "../src/analyzer.js";

function analyze(source, options) {
  const ast = parse(source, {
    ecmaVersion: "latest",
    loc: true,
    range: true,
    sourceType: "module",
  });

  return new Map(
    analyzeCognitiveComplexity(ast, options).map((result) => [result.name, result.complexity]),
  );
}

describe("analyzeCognitiveComplexity", () => {
  it("ignores simple functions and shorthand operators", () => {
    expect(
      analyze(`
        function simple(input) {
          return input?.value ?? 0;
        }
      `).get("simple"),
    ).toBe(0);
  });

  it("counts if, else-if, and else as linear-flow breaks", () => {
    expect(
      analyze(`
        function choose(a, b) {
          if (a) {
            return 1;
          } else if (b) {
            return 2;
          } else {
            return 3;
          }
        }
      `).get("choose"),
    ).toBe(3);
  });

  it("adds nesting penalties and labeled jumps", () => {
    expect(
      analyze(`
        function sumOfPrimes(max) {
          let total = 0;
          outer: for (let i = 1; i <= max; i++) {
            for (let j = 2; j < i; j++) {
              if (i % j === 0) {
                continue outer;
              }
            }
            total += i;
          }
          return total;
        }
      `).get("sumOfPrimes"),
    ).toBe(7);
  });

  it("counts each sequence of like boolean operators", () => {
    expect(
      analyze(`
        function check(a, b, c, d, e, f) {
          if (a && b && c || d || e && f) {
            return true;
          }
          return false;
        }
      `).get("check"),
    ).toBe(4);
  });

  it("includes nested function control flow in the enclosing function by default", () => {
    const results = analyze(`
      function save(callback) {
        validate((error) => {
          if (error) {
            callback && callback(error);
          }
        });
      }
    `);

    expect(results.get("save")).toBe(3);
    expect(results.get("<anonymous>")).toBe(2);
  });

  it("can exclude nested function control flow from the enclosing function", () => {
    expect(
      analyze(
        `
          function save(callback) {
            validate((error) => {
              if (error) {
                callback && callback(error);
              }
            });
          }
        `,
        { includeNestedFunctions: false },
      ).get("save"),
    ).toBe(0);
  });

  it("counts direct recursion once per function", () => {
    expect(
      analyze(`
        function factorial(n) {
          if (n <= 1) {
            return 1;
          }
          return n * factorial(n - 1);
        }
      `).get("factorial"),
    ).toBe(2);
  });
});
