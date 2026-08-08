/**
 * The workspace gate: the single place that decides whether a command is
 * allowed to touch the file system.
 *
 * `capabilities.untrustedWorkspaces.supported` is `"limited"` in package.json,
 * which means VS Code *will* load this extension in an untrusted window. It is
 * therefore our job — not the host's — to refuse the file-system work. Keeping
 * that decision in one pure function means it is unit-testable without needing
 * an untrusted Electron window.
 */

export type WorkspaceState = {
  readonly hasWorkspaceFolder: boolean;
  readonly isTrusted: boolean;
};

export type BlockedReason = "no-workspace" | "untrusted";

export type GateDecision =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly reason: BlockedReason; readonly message: string };

export const NO_WORKSPACE_MESSAGE =
  "VCQA Reference: open a folder or workspace before running this command.";

export const UNTRUSTED_MESSAGE =
  "VCQA Reference: this workspace is not trusted, so no files were read. Trust the workspace to enable scanning.";

/** Decides whether a workspace scan may proceed. Order matters: "no workspace" is reported first because it is the more actionable problem. */
export function gateWorkspaceScan(state: WorkspaceState): GateDecision {
  if (!state.hasWorkspaceFolder) {
    return { kind: "blocked", reason: "no-workspace", message: NO_WORKSPACE_MESSAGE };
  }
  if (!state.isTrusted) {
    return { kind: "blocked", reason: "untrusted", message: UNTRUSTED_MESSAGE };
  }
  return { kind: "allowed" };
}
