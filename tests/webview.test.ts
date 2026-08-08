import { describe, expect, it } from "vitest";

import { escapeHtml, renderSummaryDocument } from "../src/lib/webview";

const summary = {
  totalFiles: 2,
  byExtension: [
    { extension: ".ts", count: 1 },
    { extension: '.<img src=x onerror="alert(1)">', count: 1 },
  ],
};

describe("escapeHtml", () => {
  it("escapes every character that can break out of text or an attribute", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("leaves safe text untouched", () => {
    expect(escapeHtml("plain text 123")).toBe("plain text 123");
  });
});

describe("renderSummaryDocument", () => {
  const render = (overrides: Partial<Parameters<typeof renderSummaryDocument>[0]> = {}) =>
    renderSummaryDocument({
      title: "Workspace File Summary",
      glob: "**/*",
      nonce: "abc123",
      summary,
      truncated: false,
      ...overrides,
    });

  it("declares a deny-by-default CSP with no script source", () => {
    const html = render();
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'none'");
    expect(html).toContain("style-src 'nonce-abc123'");
  });

  it("contains no script tags and no remote references", () => {
    const html = render();
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("escapes workspace-derived values", () => {
    const html = render();
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("escapes the user-supplied glob", () => {
    const html = render({ glob: '"><script>alert(1)</script>' });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("notes truncation only when the result set was capped", () => {
    expect(render({ truncated: false })).not.toContain("lower bound");
    expect(render({ truncated: true })).toContain("lower bound");
  });
});
