import { describe, expect, it } from "vitest";

import { globInputBoxValidator, MAX_GLOB_LENGTH, validateGlob } from "../src/lib/validate";

describe("validateGlob", () => {
  it.each(["**/*.ts", "src/**/*.{ts,tsx}", "docs/*.md", "src/[abc]*.ts", "**/*.?s"])(
    "accepts %s",
    (pattern) => {
      expect(validateGlob(pattern)).toEqual({ ok: true, value: pattern });
    },
  );

  it("trims surrounding whitespace", () => {
    expect(validateGlob("  **/*.ts  ")).toEqual({ ok: true, value: "**/*.ts" });
  });

  it("rejects empty and whitespace-only input", () => {
    expect(validateGlob("")).toMatchObject({ ok: false });
    expect(validateGlob("   ")).toMatchObject({ ok: false });
  });

  it("rejects over-long input", () => {
    const long = `${"a".repeat(MAX_GLOB_LENGTH)}b`;
    expect(validateGlob(long)).toMatchObject({ ok: false });
  });

  it("rejects POSIX absolute paths", () => {
    expect(validateGlob("/etc/passwd")).toMatchObject({
      ok: false,
      reason: "Pattern must be workspace-relative, not absolute.",
    });
  });

  it("rejects Windows absolute paths", () => {
    expect(validateGlob("C:\\Windows\\**")).toMatchObject({
      ok: false,
      reason: "Pattern must be workspace-relative, not absolute.",
    });
  });

  it("rejects parent traversal in either separator style", () => {
    expect(validateGlob("../secrets/**")).toMatchObject({ ok: false });
    expect(validateGlob("src\\..\\..\\**")).toMatchObject({ ok: false });
  });

  it("allows a dot that is not a traversal segment", () => {
    expect(validateGlob("src/..hidden/*.ts")).toMatchObject({ ok: true });
  });

  it("rejects shell metacharacters and other unsupported characters", () => {
    for (const pattern of ["**/*.ts;rm -rf /", "$(whoami)/**", "**/*.ts|cat", "a`b`/**"]) {
      expect(validateGlob(pattern)).toMatchObject({ ok: false });
    }
  });

  it("rejects non-string input defensively", () => {
    expect(validateGlob(42 as unknown as string)).toMatchObject({ ok: false });
  });
});

describe("globInputBoxValidator", () => {
  it("returns undefined for a valid pattern", () => {
    expect(globInputBoxValidator("**/*.ts")).toBeUndefined();
  });

  it("returns the reason string for an invalid pattern", () => {
    expect(globInputBoxValidator("/etc/**")).toBe(
      "Pattern must be workspace-relative, not absolute.",
    );
  });
});
