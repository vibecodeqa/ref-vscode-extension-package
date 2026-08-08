/**
 * Pure summarisation of a list of workspace-relative file paths.
 * No VS Code API, no file system: just data in, data out.
 */

export type ExtensionCount = {
  readonly extension: string;
  readonly count: number;
};

export type FileSummary = {
  readonly totalFiles: number;
  readonly byExtension: readonly ExtensionCount[];
};

/** Label used for files with no meaningful extension (`README`, `.gitignore`). */
export const NO_EXTENSION = "(none)";

/** Returns the lower-cased extension of a path, including the dot. */
export function extensionOf(path: string): string {
  const normalised = path.replace(/\\/g, "/");
  const base = normalised.slice(normalised.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) {
    return NO_EXTENSION;
  }
  return base.slice(dot).toLowerCase();
}

/** Groups paths by extension, most common first, ties broken alphabetically. */
export function summarizeFiles(paths: readonly string[]): FileSummary {
  const counts = new Map<string, number>();
  for (const path of paths) {
    const key = extensionOf(path);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const byExtension = [...counts.entries()]
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count || a.extension.localeCompare(b.extension));

  return { totalFiles: paths.length, byExtension };
}

/** One-line rendering used for the status notification. */
export function formatSummaryLine(summary: FileSummary): string {
  if (summary.totalFiles === 0) {
    return "No files matched.";
  }
  const top = summary.byExtension
    .slice(0, 3)
    .map((entry) => `${entry.extension} ${entry.count}`)
    .join(", ");
  return `${summary.totalFiles} file(s): ${top}`;
}
