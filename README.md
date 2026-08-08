# VCQA Reference VS Code Extension

Product-neutral reference implementation for the VibeCode QA
[VS Code Extension Package](https://vibecodeqa.online/docs/standards/stacks/vscode-extension-package/)
stack charter, judged alongside the published
[TypeScript v1](https://vibecodeqa.online/standards/typescript/v1/),
[Testing v1](https://vibecodeqa.online/standards/testing/v1/) and
[Security v1](https://vibecodeqa.online/standards/security/v1/) rubrics.

> `vscode-extension-package` is a **charter**, not a versioned rubric. There is
> no `standards/vscode-extension-package/v1/` page yet. This repo is the
> forkable evidence of what the charter's five owned rules — activation scope,
> workspace trust behaviour, command/webview boundaries, marketplace metadata,
> extension test coverage — look like when they are actually enforced.

## Official starter first

If you only want a new VS Code extension, start with the official path:

- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)
- [`yo code` generator](https://www.npmjs.com/package/generator-code)
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

This repo is not a replacement for those. It is a VCQA reference fixture that
shows how the extension is judged once activation scope, trust handling, webview
CSP, packaging, supply-chain gates and a tracked VCQA report are all required.

## Quickstart

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm test              # Vitest — pure logic
pnpm test:coverage     # same, with enforced thresholds over src/lib/**
pnpm compile
pnpm test:integration  # VS Code extension host (Electron); on Linux use xvfb-run -a
pnpm package           # produces ref-vscode-extension-package.vsix
pnpm audit
pnpm licenses:check
```

Press <kbd>F5</kbd> in VS Code to launch an Extension Development Host, then run
**VCQA Reference: Show Workspace File Summary** from the command palette.

## What the extension does

Two commands, deliberately small, chosen because they exercise every boundary
the charter cares about:

| Command | Behaviour |
| --- | --- |
| `VCQA Reference: Show Workspace File Summary` | Enumerates workspace files and renders a breakdown by extension in a locked-down webview. |
| `VCQA Reference: Count Workspace Files By Glob` | Prompts for a workspace-relative glob, validates it, reports the match count. |

Two settings, both namespaced: `refVscodeExt.excludeGlob` and
`refVscodeExt.maxResults`.

## Activation scope, and why it is what it is

```jsonc
"activationEvents": [
  "onCommand:refVscodeExt.showWorkspaceSummary",
  "onCommand:refVscodeExt.countFilesByGlob"
]
```

The extension is inert until a user explicitly runs one of its commands. That is
the narrowest useful scope for a command-only extension:

- **Not `*`.** Wildcard activation loads the extension into every window a user
  opens, pays startup cost in projects that will never use it, and gives it a
  foothold in workspaces it has no business reading. It is never acceptable.
- **Not `onStartupFinished`.** Same cost, deferred. This extension has no
  background work to do, so there is nothing to warm up.
- **Not `workspaceContains:…`.** That would be the right answer for an extension
  keyed to a specific project marker (a `pubspec.yaml`, a `wrangler.toml`). This
  one is workspace-shape agnostic, so a `workspaceContains:` glob would be a
  guess, and a wrong guess activates eagerly for unrelated repositories.

Since VS Code 1.74 the `onCommand:` entries for contributed commands are implied
and could be omitted. They are kept because the manifest is the artifact a
reviewer reads, and an empty `activationEvents` array does not say "narrow" out
loud. `tests/manifest.test.ts` fails the build if anything broader appears, and
`src/integration/extension.test.ts` asserts inside a real VS Code instance that
the extension is *not* active before a command is invoked.

## Workspace trust and missing workspaces

`capabilities.untrustedWorkspaces.supported` is `"limited"`. VS Code therefore
loads this extension in an untrusted window, which makes restraint the
extension's own responsibility rather than the host's.

Every file-system path funnels through one pure function,
[`gateWorkspaceScan`](src/lib/trust.ts):

- **No folder open** → `blocked / no-workspace`, warning shown, nothing read.
- **Untrusted workspace** → `blocked / untrusted`, warning shown, nothing read.
- **Trusted, folder open** → the scan proceeds.

Keeping the decision pure means the untrusted branch is covered by ordinary unit
tests (`tests/trust.test.ts`) instead of needing an untrusted Electron window,
which cannot be scripted from inside the extension host. `refVscodeExt.excludeGlob`
is listed in `restrictedConfigurations` because it steers which files get read.
`onDidGrantWorkspaceTrust` is handled so the window recovers without a reload.

## Webview security boundary

The summary panel is created with `enableScripts: false`, `enableForms: false`,
`enableCommandUris: false` and `localResourceRoots: []` — the webview cannot run
a script and cannot load a single file from disk, not even from the extension's
own directory. The document declares:

```
default-src 'none'; script-src 'none'; style-src 'nonce-<random>';
```

Every workspace-derived value (file extensions, the user's glob) is HTML-escaped
by [`escapeHtml`](src/lib/webview.ts) before interpolation. The renderer is a
pure function, so `tests/webview.test.ts` asserts the CSP, the absence of any
`<script>` or remote URL, and that an injected `<img onerror=…>` comes out inert.

## Test strategy

Two layers, split on cost rather than on convention:

- **Vitest (`tests/`, 48 tests across 5 files)** — pure logic: glob
  validation, the trust gate, summarisation, HTML escaping and CSP rendering,
  plus manifest assertions that keep the contribution points narrow. Runs in
  under a second, no Electron.
- **VS Code extension harness (`src/integration/`)** — `@vscode/test-cli` +
  `@vscode/test-electron` boot a real VS Code against
  `test-fixtures/workspace/` and assert only what genuinely needs the extension
  host: the extension is discoverable, it is *not* active before a command runs,
  it activates on demand, every contributed command is really registered,
  `findFiles` returns the fixture files, and `node_modules` is excluded.

Anything provable without Electron is proved without Electron. Coverage is
enforced (95% statements/functions/lines, 90% branches) over `src/lib/**` only —
`src/extension.ts` is the host adapter and is covered by the integration layer,
so folding it into the same threshold would buy a number rather than a test. See
[`docs/vcqa-report.md`](docs/vcqa-report.md) for what that costs in coverage.

## Packaging and marketplace release expectations

`pnpm package` runs `vsce package --no-dependencies` and produces
`ref-vscode-extension-package.vsix`. CI runs the same command and uploads the
artifact, so every green run on `main` leaves a real, installable package behind.
Install it locally with `code --install-extension ref-vscode-extension-package.vsix`.

**This extension is never published.** `private: true` is set, there is no
`vsce publish` in any script or workflow, and no marketplace PAT exists for it.
Release expectations are documented rather than exercised:

- A release is a tagged commit on `main` whose `package.json` version matches the
  top released heading in [`CHANGELOG.md`](CHANGELOG.md).
- Publishing happens from CI with a scoped Azure DevOps PAT held as a repository
  secret — never from a developer machine.
- `CHANGELOG.md` carries the release-notes policy in full; the Marketplace
  renders that file as the extension's Changelog tab.

## Supply chain

Zero runtime dependencies. CI runs `pnpm audit --audit-level=high` and a license
allow-list gate (`scripts/check-licenses.mjs`). Neither step is allowed to fail
softly; the exception process is written down in [`SECURITY.md`](SECURITY.md).

## Standards target

| Standard | Status | Role |
| --- | --- | --- |
| [vscode-extension-package](https://vibecodeqa.online/docs/standards/stacks/vscode-extension-package/) | charter (`planned`, no rubric) | Activation scope, trust, command/webview boundaries, marketplace metadata, extension tests |
| [TypeScript v1](https://vibecodeqa.online/standards/typescript/v1/) | published | Strict compiler flags, typed boundaries |
| [Testing v1](https://vibecodeqa.online/standards/testing/v1/) | published | Test layering and CI evidence |
| [Security v1](https://vibecodeqa.online/standards/security/v1/) | published | Input validation, output safety, supply chain |

The standard is the source of truth. This repo is a forkable implementation
example.

## VCQA evidence

The tracked report lives at [`docs/vcqa-report.md`](docs/vcqa-report.md).

## License

[MIT](LICENSE).
