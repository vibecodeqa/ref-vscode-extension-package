import { defineConfig } from "vitest/config";

// Only the pure-logic suite runs here. Anything that imports the `vscode`
// module runs in the Electron harness instead (see .vscode-test.mjs).
//
// Coverage is measured over `src/lib/**` only, and it is measured strictly.
// `src/extension.ts` is deliberately excluded: it is the VS Code host adapter,
// it cannot be loaded outside an extension host, and it is exercised by the
// integration suite instead. Including it would mean either a fake threshold or
// a fake test.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      reporter: ["text-summary", "json", "lcov"],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
