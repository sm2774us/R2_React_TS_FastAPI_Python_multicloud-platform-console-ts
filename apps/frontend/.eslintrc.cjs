module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["@typescript-eslint", "react-hooks"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
  },
  overrides: [
    {
      files: ["tests/e2e/**/*.ts"],
      rules: { "@typescript-eslint/no-explicit-any": "off" }
    }
  ],
  ignorePatterns: ["dist", "node_modules", "playwright-report", "test-results", "coverage"]
};
