# oxlint-plugin-cognitive-complexity

Oxlint plugin that reports JavaScript and TypeScript functions whose cognitive complexity is above a configured maximum.

## Install

```sh
pnpm add -D oxlint-plugin-cognitive-complexity
```

Or:

```sh
npm install --save-dev oxlint-plugin-cognitive-complexity
```

## Usage

Add the plugin to your oxlint config:

```jsonc
{
  "jsPlugins": ["oxlint-plugin-cognitive-complexity"],
  "rules": {
    "cognitive-complexity/max-cognitive-complexity": ["error", 15]
  }
}
```

Then run oxlint normally:

```sh
pnpm oxlint
```

For a local checkout, point `jsPlugins` at this repository's entry file:

```jsonc
{
  "jsPlugins": [
    {
      "name": "cognitive-complexity",
      "specifier": "./index.js"
    }
  ],
  "rules": {
    "cognitive-complexity/max-cognitive-complexity": ["error", { "max": 15 }]
  }
}
```

This is an oxlint JavaScript plugin, not a separate CLI. Oxlint's public external plugin API currently loads JavaScript plugins. A Rust implementation would need to be contributed as an oxlint native rule inside the oxlint repository.

## Quick Start

Add it to `package.json` scripts:

```json
{
  "scripts": {
    "lint": "oxlint"
  }
}
```

Run it:

```sh
pnpm run lint
```

## Output

```text
Function 'render' has a cognitive complexity of 21. Maximum allowed is 15.
```

## Options

The rule accepts either a number:

```jsonc
{
  "rules": {
    "cognitive-complexity/max-cognitive-complexity": ["error", 15]
  }
}
```

Or an object:

```jsonc
{
  "rules": {
    "cognitive-complexity/max-cognitive-complexity": [
      "error",
      {
        "max": 15,
        "includeNestedFunctions": true
      }
    ]
  }
}
```

- `max` or `threshold`: maximum allowed cognitive complexity. Defaults to `15`.
- `includeNestedFunctions`: count callback and nested-function control flow in the enclosing function, with an extra nesting level. Defaults to `true`.

## What Is Counted

The rule follows the SonarSource cognitive-complexity model closely for JavaScript and TypeScript syntax:

- `if`, `else if`, `else`, ternaries, loops, `switch`, and `catch`
- nesting penalties for nested flow-breaking structures
- sequences of `&&` and `||` logical operators
- labeled `break` and `continue`
- direct recursion

Optional chaining and nullish coalescing are treated as shorthand and do not add complexity.

## Development

```sh
pnpm install
pnpm test
pnpm run lint:fixture
npm pack --dry-run
```

## Release

This repository is configured to publish to npm from GitHub Actions when a GitHub Release is published.

Repository setup:

1. Create an npm automation token.
2. Add it to the GitHub repository as an Actions secret named `NPM_TOKEN`.
3. Optional but recommended: create an environment named `npm` and require approval for publishing.

Release flow:

1. Update `package.json` version.
2. Merge the change to `main`.
3. Create a GitHub Release whose tag matches the package version, for example `v0.1.0`.
4. The `Publish` workflow runs verification and publishes with npm provenance.

You can also run the `Publish` workflow manually from GitHub Actions. It publishes the current checked-out package version, so avoid rerunning it after a version has already been published to npm.
