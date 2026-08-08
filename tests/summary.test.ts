import { describe, expect, it } from "vitest";

import { extensionOf, formatSummaryLine, NO_EXTENSION, summarizeFiles } from "../src/lib/summary";

describe("extensionOf", () => {
  it("returns the lower-cased extension including the dot", () => {
    expect(extensionOf("src/lib/summary.TS")).toBe(".ts");
  });

  it("normalises Windows separators", () => {
    expect(extensionOf("src\\lib\\summary.ts")).toBe(".ts");
  });

  it("treats dotfiles as having no extension", () => {
    expect(extensionOf(".gitignore")).toBe(NO_EXTENSION);
    expect(extensionOf("nested/dir/.env")).toBe(NO_EXTENSION);
  });

  it("treats extensionless files as having no extension", () => {
    expect(extensionOf("LICENSE")).toBe(NO_EXTENSION);
  });

  it("treats a trailing dot as having no extension", () => {
    expect(extensionOf("weird.")).toBe(NO_EXTENSION);
  });

  it("uses only the final extension of a multi-part name", () => {
    expect(extensionOf("archive.tar.gz")).toBe(".gz");
  });
});

describe("summarizeFiles", () => {
  it("counts an empty list", () => {
    expect(summarizeFiles([])).toEqual({ totalFiles: 0, byExtension: [] });
  });

  it("groups by extension, most common first", () => {
    const summary = summarizeFiles(["a.ts", "b.ts", "c.md", "d.ts", "e.md", "f.json"]);
    expect(summary.totalFiles).toBe(6);
    expect(summary.byExtension).toEqual([
      { extension: ".ts", count: 3 },
      { extension: ".md", count: 2 },
      { extension: ".json", count: 1 },
    ]);
  });

  it("breaks count ties alphabetically", () => {
    const summary = summarizeFiles(["z.ts", "a.md"]);
    expect(summary.byExtension.map((entry) => entry.extension)).toEqual([".md", ".ts"]);
  });
});

describe("formatSummaryLine", () => {
  it("describes an empty result", () => {
    expect(formatSummaryLine({ totalFiles: 0, byExtension: [] })).toBe("No files matched.");
  });

  it("lists at most the three most common extensions", () => {
    const summary = summarizeFiles(["a.ts", "b.ts", "c.md", "d.json", "e.css"]);
    expect(formatSummaryLine(summary)).toBe("5 file(s): .ts 2, .css 1, .json 1");
  });
});
