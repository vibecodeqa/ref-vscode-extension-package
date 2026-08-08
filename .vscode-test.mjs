import { defineConfig } from "@vscode/test-cli";

// Integration tests run inside a real VS Code instance (downloaded by
// @vscode/test-electron) against a small committed fixture workspace, so
// findFiles() has deterministic content to enumerate.
export default defineConfig({
  label: "integration",
  files: "out/integration/**/*.test.js",
  version: "stable",
  workspaceFolder: "./test-fixtures/workspace",
  launchArgs: ["--disable-extensions", "--disable-gpu"],
  mocha: {
    ui: "bdd",
    timeout: 30000,
  },
});
