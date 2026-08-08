/**
 * Webview rendering.
 *
 * Security boundary, stated explicitly because the standard asks for one:
 *
 *  - The panel is created with `enableScripts: false`, so no JavaScript of any
 *    kind runs in the webview.
 *  - `localResourceRoots: []` — the webview may not load a single file from
 *    disk, not even from the extension's own directory.
 *  - The document declares `default-src 'none'` and `script-src 'none'`. The
 *    only relaxation is a nonced `<style>` block, so even a successful HTML
 *    injection cannot pull in a remote resource or execute anything.
 *  - Every value derived from the workspace (file names, extensions, the user's
 *    glob) goes through `escapeHtml` before it reaches the document.
 *
 * The renderer is a pure function so those guarantees are unit-testable.
 */

import type { FileSummary } from "./summary";

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export type SummaryDocumentOptions = {
  readonly title: string;
  readonly glob: string;
  readonly nonce: string;
  readonly summary: FileSummary;
  readonly truncated: boolean;
};

/** Renders the full webview document. Contains no scripts and no external references. */
export function renderSummaryDocument(options: SummaryDocumentOptions): string {
  const { title, glob, nonce, summary, truncated } = options;

  const rows = summary.byExtension
    .map(
      (entry) =>
        `<tr><td>${escapeHtml(entry.extension)}</td><td>${escapeHtml(String(entry.count))}</td></tr>`,
    )
    .join("\n      ");

  const truncationNote = truncated
    ? `<p class="note">Result set was capped by <code>refVscodeExt.maxResults</code>; counts are a lower bound.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'none'; style-src 'nonce-${escapeHtml(nonce)}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style nonce="${escapeHtml(nonce)}">
      body { font-family: var(--vscode-font-family); padding: 1rem; }
      table { border-collapse: collapse; margin-top: 0.5rem; }
      th, td { text-align: left; padding: 0.2rem 1.5rem 0.2rem 0; }
      .note { opacity: 0.8; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>Pattern <code>${escapeHtml(glob)}</code> matched <strong>${escapeHtml(String(summary.totalFiles))}</strong> file(s).</p>
    ${truncationNote}
    <table>
      <thead><tr><th>Extension</th><th>Files</th></tr></thead>
      <tbody>
      ${rows}
      </tbody>
    </table>
  </body>
</html>`;
}
