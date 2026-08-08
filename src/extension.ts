import { randomBytes } from "node:crypto";
import * as vscode from "vscode";

import { type FileSummary, formatSummaryLine, summarizeFiles } from "./lib/summary";
import { type BlockedReason, gateWorkspaceScan } from "./lib/trust";
import { globInputBoxValidator, validateGlob } from "./lib/validate";
import { renderSummaryDocument } from "./lib/webview";

export const SHOW_SUMMARY_COMMAND = "refVscodeExt.showWorkspaceSummary";
export const COUNT_BY_GLOB_COMMAND = "refVscodeExt.countFilesByGlob";

const CONFIG_SECTION = "refVscodeExt";
const DEFAULT_EXCLUDE = "**/node_modules/**";
const DEFAULT_MAX_RESULTS = 2000;

/**
 * Commands return a result object instead of only firing UI. Integration tests
 * assert on this; nothing about it is exposed to users.
 */
export type CommandResult =
  | { readonly status: "blocked"; readonly reason: BlockedReason }
  | { readonly status: "cancelled" }
  | { readonly status: "invalid"; readonly reason: string }
  | {
      readonly status: "ok";
      readonly glob: string;
      readonly summary: FileSummary;
      readonly truncated: boolean;
    };

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(SHOW_SUMMARY_COMMAND, () => showWorkspaceSummary(context)),
    vscode.commands.registerCommand(COUNT_BY_GLOB_COMMAND, (input?: string) =>
      countFilesByGlob(typeof input === "string" ? input : undefined),
    ),
    // Trust can be granted while the window is open. Nothing is cached across
    // the boundary, but tell the user the commands are now usable.
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      void vscode.window.showInformationMessage(
        "VCQA Reference: workspace trusted — file scanning is now enabled.",
      );
    }),
  );
}

export function deactivate(): void {
  // No resources are held outside `context.subscriptions`.
}

/** Reads the current workspace state through the gate in `lib/trust.ts`. */
function checkGate(): { readonly blocked: CommandResult | null } {
  const decision = gateWorkspaceScan({
    hasWorkspaceFolder: (vscode.workspace.workspaceFolders ?? []).length > 0,
    isTrusted: vscode.workspace.isTrusted,
  });

  if (decision.kind === "blocked") {
    void vscode.window.showWarningMessage(decision.message);
    return { blocked: { status: "blocked", reason: decision.reason } };
  }
  return { blocked: null };
}

function readConfig(): { readonly exclude: string; readonly maxResults: number } {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const exclude = config.get<string>("excludeGlob", DEFAULT_EXCLUDE);
  const maxResults = config.get<number>("maxResults", DEFAULT_MAX_RESULTS);

  // The setting is `restrictedConfigurations`-listed, but defend anyway: a
  // malformed value from a workspace-level setting must not widen the scan.
  const safeExclude = validateGlob(exclude).ok ? exclude : DEFAULT_EXCLUDE;
  const safeMaxResults =
    Number.isInteger(maxResults) && maxResults > 0 && maxResults <= 20000
      ? maxResults
      : DEFAULT_MAX_RESULTS;

  return { exclude: safeExclude, maxResults: safeMaxResults };
}

async function scanWorkspace(
  glob: string,
): Promise<{ readonly summary: FileSummary; readonly truncated: boolean }> {
  const { exclude, maxResults } = readConfig();
  const uris = await vscode.workspace.findFiles(glob, exclude, maxResults);
  const paths = uris.map((uri) => vscode.workspace.asRelativePath(uri, false));
  return { summary: summarizeFiles(paths), truncated: uris.length >= maxResults };
}

/** Scans the workspace with a fixed pattern and renders the result in a locked-down webview. */
export async function showWorkspaceSummary(
  context: vscode.ExtensionContext,
): Promise<CommandResult> {
  const gate = checkGate();
  if (gate.blocked) {
    return gate.blocked;
  }

  const glob = "**/*";
  const { summary, truncated } = await scanWorkspace(glob);

  const panel = vscode.window.createWebviewPanel(
    "refVscodeExt.summary",
    "Workspace File Summary",
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
    {
      // Security boundary — see the note at the top of src/lib/webview.ts.
      enableScripts: false,
      enableForms: false,
      enableCommandUris: false,
      localResourceRoots: [],
      retainContextWhenHidden: false,
    },
  );
  context.subscriptions.push(panel);

  panel.webview.html = renderSummaryDocument({
    title: "Workspace File Summary",
    glob,
    nonce: randomBytes(16).toString("base64"),
    summary,
    truncated,
  });

  return { status: "ok", glob, summary, truncated };
}

/** Prompts for a glob, validates it, and reports the match count. */
export async function countFilesByGlob(input?: string): Promise<CommandResult> {
  const gate = checkGate();
  if (gate.blocked) {
    return gate.blocked;
  }

  const raw =
    input ??
    (await vscode.window.showInputBox({
      title: "Count Workspace Files By Glob",
      prompt: "Workspace-relative glob, for example **/*.ts",
      value: "**/*.ts",
      ignoreFocusOut: true,
      validateInput: globInputBoxValidator,
    }));

  if (raw === undefined) {
    return { status: "cancelled" };
  }

  const validated = validateGlob(raw);
  if (!validated.ok) {
    void vscode.window.showErrorMessage(`VCQA Reference: ${validated.reason}`);
    return { status: "invalid", reason: validated.reason };
  }

  const { summary, truncated } = await scanWorkspace(validated.value);
  void vscode.window.showInformationMessage(
    `VCQA Reference: ${formatSummaryLine(summary)}${truncated ? " (capped)" : ""}`,
  );

  return { status: "ok", glob: validated.value, summary, truncated };
}
