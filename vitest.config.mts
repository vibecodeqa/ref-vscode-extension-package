import { defineConfig } from "vitest/config";

// Only the pure-logic suite runs here. Anything that imports the `vscode`
// module runs in the Electron harness instead (see .vscode-test.mjs).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
