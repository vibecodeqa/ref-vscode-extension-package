/**
 * VS Code extension integration tests.
 *
 * These run inside a real VS Code instance (Electron) via @vscode/test-cli, with
 * `test-fixtures/workspace` opened as the workspace folder. Only behaviour that
 * genuinely needs the extension host lives here — pure logic is covered by the
 * much cheaper Vitest suite in `tests/`.
 */

import * as assert from "node:assert/strict";
import * as vscode from "vscode";

import type { CommandResult } from "../extension";

const EXTENSION_ID = "vibecodeqa.ref-vscode-extension-package";
const SHOW_SUMMARY_COMMAND = "refVscodeExt.showWorkspaceSummary";
const COUNT_BY_GLOB_COMMAND = "refVscodeExt.countFilesByGlob";

describe("ref-vscode-extension-package", () => {
  it("is installed in the test host", () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `extension ${EXTENSION_ID} was not found`);
  });

  it("declares only narrow activation events", () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension);
    const events: string[] = extension.packageJSON.activationEvents ?? [];
    assert.ok(events.length > 0, "expected explicit activation events");
    for (const event of events) {
      assert.ok(
        event.startsWith("onCommand:"),
        `activation event '${event}' is broader than onCommand:`,
      );
    }
    assert.ok(!events.includes("*"), "'*' activation is forbidden");
  });

  it("is not active before one of its commands is used", () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension);
    // The fixture workspace contains nothing this extension reacts to, so an
    // eager activation here would mean the activation scope is too wide.
    assert.equal(extension.isActive, false);
  });

  it("activates on demand and registers every contributed command", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension);
    await extension.activate();

    const registered = new Set(await vscode.commands.getCommands(true));
    const contributed: { command: string }[] = extension.packageJSON.contributes.commands;
    assert.ok(contributed.length >= 2);
    for (const entry of contributed) {
      assert.ok(registered.has(entry.command), `command ${entry.command} was not registered`);
    }
  });

  it("summarises the fixture workspace and opens a scriptless webview", async () => {
    const result = (await vscode.commands.executeCommand(SHOW_SUMMARY_COMMAND)) as CommandResult;

    assert.equal(result.status, "ok");
    if (result.status !== "ok") {
      return;
    }
    assert.ok(result.summary.totalFiles > 0, "fixture workspace should contain files");
    const markdown = result.summary.byExtension.find((entry) => entry.extension === ".md");
    assert.ok(markdown, "expected .md files in the fixture workspace");
    assert.ok(markdown.count >= 1);
  });

  it("excludes node_modules from the scan", async () => {
    const result = (await vscode.commands.executeCommand(
      COUNT_BY_GLOB_COMMAND,
      "**/*.js",
    )) as CommandResult;

    assert.equal(result.status, "ok");
    if (result.status !== "ok") {
      return;
    }
    // test-fixtures/workspace/node_modules/ignored-package/index.js exists but
    // must be filtered out by the default exclude glob.
    assert.equal(result.summary.totalFiles, 0);
  });

  it("rejects an escaping glob without touching the file system", async () => {
    const result = (await vscode.commands.executeCommand(
      COUNT_BY_GLOB_COMMAND,
      "../../**/*",
    )) as CommandResult;

    assert.equal(result.status, "invalid");
  });

  it("reports the workspace as trusted in the test host", () => {
    // The harness runs trusted; the untrusted branch is covered by the pure
    // gate tests in tests/trust.test.ts because an untrusted window cannot be
    // scripted from inside the extension host.
    assert.equal(vscode.workspace.isTrusted, true);
  });
});
