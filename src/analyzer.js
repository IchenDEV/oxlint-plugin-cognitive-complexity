const DEFAULT_OPTIONS = {
  includeNestedFunctions: true,
};

export function analyzeCognitiveComplexity(program, options = {}) {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const results = [];

  discoverFunctions(program, null, results, resolvedOptions);
  return results;
}

function discoverFunctions(node, parent, results, options) {
  if (!node) {
    return;
  }

  if (isFunctionLike(node)) {
    results.push(...analyzeFunction(node, parent, options));
    return;
  }

  visitChildren(node, (child, childParent) => {
    discoverFunctions(child, childParent, results, options);
  });
}

function analyzeFunction(node, parent, options) {
  const result = {
    node,
    name: getFunctionName(node, parent),
    complexity: 0,
    recursive: false,
  };
  const nestedResults = [];
  const context = {
    result,
    nesting: 0,
    includeNestedFunctions: options.includeNestedFunctions,
    countRecursion: true,
  };

  visitFunctionContents(node, context, nestedResults, options, true);

  if (result.recursive) {
    addFundamental(context);
  }

  return [result, ...nestedResults];
}

function visitFunctionContents(node, context, nestedResults, options, collectNestedFunctions) {
  for (const parameter of arrayNodes(node.params)) {
    visitNode(parameter, context, node, nestedResults, options, collectNestedFunctions);
  }

  if (node.body) {
    visitNode(node.body, context, node, nestedResults, options, collectNestedFunctions);
  }
}

function visitNode(node, context, parent, nestedResults, options, collectNestedFunctions) {
  if (!node) {
    return;
  }

  if (isFunctionLike(node)) {
    if (collectNestedFunctions) {
      nestedResults.push(...analyzeFunction(node, parent, options));
    }

    if (context.includeNestedFunctions) {
      withTemporaryContext(context, { nesting: context.nesting + 1, countRecursion: false }, () => {
        visitFunctionContents(node, context, nestedResults, options, false);
      });
    }
    return;
  }

  switch (node.type) {
    case "IfStatement":
      visitIfStatement(node, context, nestedResults, options, collectNestedFunctions, false);
      return;
    case "ConditionalExpression":
      visitConditionalExpression(node, context, nestedResults, options, collectNestedFunctions);
      return;
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "WhileStatement":
    case "DoWhileStatement":
      visitLoop(node, context, nestedResults, options, collectNestedFunctions);
      return;
    case "SwitchStatement":
      visitSwitchStatement(node, context, nestedResults, options, collectNestedFunctions);
      return;
    case "CatchClause":
      visitCatchClause(node, context, nestedResults, options, collectNestedFunctions);
      return;
    case "BreakStatement":
    case "ContinueStatement":
      if (node.label) {
        addFundamental(context);
      }
      return;
    case "CallExpression":
    case "NewExpression":
      visitCallLikeExpression(node, context, parent, nestedResults, options, collectNestedFunctions);
      return;
    case "LogicalExpression":
      visitLogicalExpression(node, parent, context, nestedResults, options, collectNestedFunctions);
      return;
    default:
      visitChildren(node, (child, childParent) => {
        visitNode(child, context, childParent, nestedResults, options, collectNestedFunctions);
      });
  }
}

function visitIfStatement(node, context, nestedResults, options, collectNestedFunctions, isElseIf) {
  if (isElseIf) {
    addFundamental(context);
  } else {
    addStructural(context);
  }

  visitNode(node.test, context, node, nestedResults, options, collectNestedFunctions);

  withNesting(context, () => {
    visitNode(node.consequent, context, node, nestedResults, options, collectNestedFunctions);
  });

  if (!node.alternate) {
    return;
  }

  if (node.alternate.type === "IfStatement") {
    visitIfStatement(node.alternate, context, nestedResults, options, collectNestedFunctions, true);
    return;
  }

  addFundamental(context);
  withNesting(context, () => {
    visitNode(node.alternate, context, node, nestedResults, options, collectNestedFunctions);
  });
}

function visitConditionalExpression(node, context, nestedResults, options, collectNestedFunctions) {
  addStructural(context);
  visitNode(node.test, context, node, nestedResults, options, collectNestedFunctions);

  withNesting(context, () => {
    visitNode(node.consequent, context, node, nestedResults, options, collectNestedFunctions);
    visitNode(node.alternate, context, node, nestedResults, options, collectNestedFunctions);
  });
}

function visitLoop(node, context, nestedResults, options, collectNestedFunctions) {
  addStructural(context);

  for (const key of ["init", "test", "update", "left", "right"]) {
    visitNode(node[key], context, node, nestedResults, options, collectNestedFunctions);
  }

  withNesting(context, () => {
    visitNode(node.body, context, node, nestedResults, options, collectNestedFunctions);
  });
}

function visitSwitchStatement(node, context, nestedResults, options, collectNestedFunctions) {
  addStructural(context);
  visitNode(node.discriminant, context, node, nestedResults, options, collectNestedFunctions);

  withNesting(context, () => {
    for (const switchCase of arrayNodes(node.cases)) {
      visitNode(switchCase.test, context, switchCase, nestedResults, options, collectNestedFunctions);
      for (const statement of arrayNodes(switchCase.consequent)) {
        visitNode(statement, context, switchCase, nestedResults, options, collectNestedFunctions);
      }
    }
  });
}

function visitCatchClause(node, context, nestedResults, options, collectNestedFunctions) {
  addStructural(context);
  visitNode(node.param, context, node, nestedResults, options, collectNestedFunctions);

  withNesting(context, () => {
    visitNode(node.body, context, node, nestedResults, options, collectNestedFunctions);
  });
}

function visitCallLikeExpression(node, context, parent, nestedResults, options, collectNestedFunctions) {
  if (context.countRecursion && isDirectRecursiveCall(node, context.result.name)) {
    context.result.recursive = true;
  }

  visitChildren(node, (child, childParent) => {
    visitNode(child, context, childParent, nestedResults, options, collectNestedFunctions);
  });
}

function visitLogicalExpression(node, parent, context, nestedResults, options, collectNestedFunctions) {
  if (isBooleanLogicalExpression(node) && !isBooleanLogicalExpression(parent)) {
    const sequences = countBooleanOperatorSequences(node);
    for (let index = 0; index < sequences; index += 1) {
      addFundamental(context);
    }
  }

  visitChildren(node, (child, childParent) => {
    visitNode(child, context, childParent, nestedResults, options, collectNestedFunctions);
  });
}

function addStructural(context) {
  context.result.complexity += 1 + context.nesting;
}

function addFundamental(context) {
  context.result.complexity += 1;
}

function withNesting(context, callback) {
  withTemporaryContext(context, { nesting: context.nesting + 1 }, callback);
}

function withTemporaryContext(context, values, callback) {
  const previousNesting = context.nesting;
  const previousCountRecursion = context.countRecursion;

  if (values.nesting !== undefined) {
    context.nesting = values.nesting;
  }
  if (values.countRecursion !== undefined) {
    context.countRecursion = values.countRecursion;
  }

  try {
    callback();
  } finally {
    context.nesting = previousNesting;
    context.countRecursion = previousCountRecursion;
  }
}

function countBooleanOperatorSequences(node) {
  const operators = [];
  collectBooleanOperators(node, operators);

  let sequences = 0;
  let previousOperator = null;
  for (const operator of operators) {
    if (operator !== previousOperator) {
      sequences += 1;
      previousOperator = operator;
    }
  }

  return sequences;
}

function collectBooleanOperators(node, operators) {
  if (!isBooleanLogicalExpression(node)) {
    return;
  }

  collectBooleanOperators(node.left, operators);
  operators.push(node.operator);
  collectBooleanOperators(node.right, operators);
}

function isDirectRecursiveCall(node, functionName) {
  if (functionName === "<anonymous>" || !node.callee) {
    return false;
  }

  if (node.callee.type === "Identifier") {
    return node.callee.name === functionName;
  }

  if (node.callee.type === "MemberExpression") {
    return !node.callee.computed && node.callee.property?.type === "Identifier" && node.callee.property.name === functionName;
  }

  return false;
}

function getFunctionName(node, parent) {
  if (node.id?.type === "Identifier") {
    return node.id.name;
  }

  if (parent?.type === "VariableDeclarator") {
    return identifierName(parent.id) ?? "<anonymous>";
  }

  if (parent?.type === "AssignmentExpression") {
    return expressionName(parent.left) ?? "<anonymous>";
  }

  if (parent?.type === "Property" || parent?.type === "PropertyDefinition" || parent?.type === "MethodDefinition") {
    return propertyName(parent.key, Boolean(parent.computed)) ?? "<anonymous>";
  }

  return "<anonymous>";
}

function identifierName(node) {
  return node?.type === "Identifier" ? node.name : null;
}

function expressionName(node) {
  if (!node) {
    return null;
  }

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "MemberExpression") {
    return propertyName(node.property, Boolean(node.computed));
  }

  return null;
}

function propertyName(node, computed) {
  if (!node) {
    return null;
  }

  if (!computed && node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "Literal" && (typeof node.value === "string" || typeof node.value === "number")) {
    return String(node.value);
  }

  return null;
}

function isFunctionLike(node) {
  return (
    node?.type === "FunctionDeclaration" ||
    node?.type === "FunctionExpression" ||
    node?.type === "ArrowFunctionExpression"
  );
}

function isBooleanLogicalExpression(node) {
  return node?.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||");
}

function visitChildren(node, callback) {
  for (const [key, value] of Object.entries(node)) {
    if (shouldSkipKey(key)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNodeLike(item)) {
          callback(item, node);
        }
      }
      continue;
    }

    if (isNodeLike(value)) {
      callback(value, node);
    }
  }
}

function arrayNodes(value) {
  return Array.isArray(value) ? value.filter(isNodeLike) : [];
}

function isNodeLike(value) {
  return typeof value === "object" && value !== null && typeof value.type === "string";
}

function shouldSkipKey(key) {
  return (
    key === "type" ||
    key === "parent" ||
    key === "loc" ||
    key === "range" ||
    key === "tokens" ||
    key === "comments" ||
    key === "leadingComments" ||
    key === "trailingComments"
  );
}
