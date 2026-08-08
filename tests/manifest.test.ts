/**
 * The manifest *is* the contract for `vscode-extension-package`, so it gets the
 * same treatment as code: assertions that the contribution points stay narrow.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest resolves its root to the directory holding vitest.config.mts.
const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  main: string;
  categories: string[];
  engines: Record<string, string>;
  activationEvents: string[];
  capabilities: Record<string, { supported: string; description: string }>;
  contributes: {
    commands: { command: string; title: string; category?: string }[];
    configuration: { properties: Record<string, unknown> };
  };
};

describe("package metadata", () => {
  it("declares marketplace categories and both engine ranges", () => {
    expect(manifest.categories.length).toBeGreaterThan(0);
    expect(manifest.engines.vscode).toMatch(/^\^1\.\d+\.\d+$/);
    expect(manifest.engines.node).toBeTruthy();
  });

  it("points main at the compiled entry point", () => {
    expect(manifest.main).toBe("./out/extension.js");
  });
});

describe("activation scope", () => {
  it("declares explicit activation events", () => {
    expect(manifest.activationEvents.length).toBeGreaterThan(0);
  });

  it("never activates eagerly", () => {
    for (const event of manifest.activationEvents) {
      expect(event.startsWith("onCommand:")).toBe(true);
    }
    expect(manifest.activationEvents).not.toContain("*");
    expect(manifest.activationEvents).not.toContain("onStartupFinished");
  });

  it("only activates on commands it actually contributes", () => {
    const contributed = new Set(manifest.contributes.commands.map((entry) => entry.command));
    for (const event of manifest.activationEvents) {
      expect(contributed.has(event.slice("onCommand:".length))).toBe(true);
    }
  });
});

describe("workspace trust", () => {
  it("declares limited untrusted-workspace support with a rationale", () => {
    const untrusted = manifest.capabilities.untrustedWorkspaces;
    expect(untrusted).toBeDefined();
    expect(untrusted?.supported).toBe("limited");
    expect((untrusted?.description ?? "").length).toBeGreaterThan(20);
  });

  it("declares virtual-workspace support", () => {
    expect(manifest.capabilities.virtualWorkspaces).toBeDefined();
  });
});

describe("contributed commands", () => {
  it("gives every command a title and a category", () => {
    expect(manifest.contributes.commands.length).toBeGreaterThan(0);
    for (const entry of manifest.contributes.commands) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.category).toBe("VCQA Reference");
    }
  });

  it("namespaces every command id", () => {
    for (const entry of manifest.contributes.commands) {
      expect(entry.command.startsWith("refVscodeExt.")).toBe(true);
    }
  });

  it("namespaces every configuration key", () => {
    for (const key of Object.keys(manifest.contributes.configuration.properties)) {
      expect(key.startsWith("refVscodeExt.")).toBe(true);
    }
  });
});
