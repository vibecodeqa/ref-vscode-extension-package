/**
 * Input validation for user-supplied glob patterns.
 *
 * Everything here is pure so it can be unit-tested without a VS Code host.
 * The extension never passes raw user input to the file-search API.
 */

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

export const MAX_GLOB_LENGTH = 200;

/** Characters a workspace-relative glob is allowed to contain. */
const ALLOWED_GLOB_CHARS = /^[A-Za-z0-9_\-.,/*{}[\]?!]+$/;

/**
 * Validates a workspace-relative glob.
 *
 * Rejected: empty input, over-long input, absolute paths (POSIX or Windows),
 * parent traversal, and any character outside the allow-list. The point is that
 * a scan can never be aimed outside the open workspace.
 */
export function validateGlob(raw: string): ValidationResult<string> {
  if (typeof raw !== "string") {
    return { ok: false, reason: "Pattern must be a string." };
  }

  const value = raw.trim();

  if (value.length === 0) {
    return { ok: false, reason: "Pattern must not be empty." };
  }
  if (value.length > MAX_GLOB_LENGTH) {
    return {
      ok: false,
      reason: `Pattern must be ${MAX_GLOB_LENGTH} characters or fewer.`,
    };
  }
  if (value.startsWith("/") || value.startsWith("\\")) {
    return { ok: false, reason: "Pattern must be workspace-relative, not absolute." };
  }
  if (/^[A-Za-z]:[/\\]/.test(value)) {
    return { ok: false, reason: "Pattern must be workspace-relative, not absolute." };
  }
  if (value.split(/[/\\]/).includes("..")) {
    return { ok: false, reason: "Pattern must not escape the workspace with '..'." };
  }
  if (!ALLOWED_GLOB_CHARS.test(value)) {
    return { ok: false, reason: "Pattern contains unsupported characters." };
  }

  return { ok: true, value };
}

/**
 * Adapter for `vscode.InputBoxOptions.validateInput`, which wants `undefined`
 * for "valid" and a message string for "invalid".
 */
export function globInputBoxValidator(raw: string): string | undefined {
  const result = validateGlob(raw);
  return result.ok ? undefined : result.reason;
}
