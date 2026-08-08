# VCQA Report

Score: **99/100** — grade **A**

| | |
| --- | --- |
| Scanner | `@vibecodeqa/cli@0.54.4`, `npx @vibecodeqa/cli@0.54.4 --markdown` |
| Run date | 2026-08-09 |
| Assessed commit | [`f8fc51785fbb28767b358c3a69c6775ce4625c62`](https://github.com/vibecodeqa/ref-vscode-extension-package/commit/f8fc51785fbb28767b358c3a69c6775ce4625c62) |
| CI evidence | [run 31280809121](https://github.com/vibecodeqa/ref-vscode-extension-package/actions/runs/31280809121) — `success`, 2026-08-08T22:04:42Z |
| Detected stack | `typescript` |

The assessed commit is the last commit before this report file existed — a report
cannot contain its own hash. The score was re-run against the head of `main`
after this file landed and was unchanged at 99/100; every later commit on `main`
must keep [CI](https://github.com/vibecodeqa/ref-vscode-extension-package/actions/workflows/ci.yml)
green, and this file is re-generated whenever the score moves.

## Standards this repo is judged against

| Standard | Status | URL |
| --- | --- | --- |
| VS Code Extension Package | **charter only — `planned`, maturity `backlog`, no rubric** | https://vibecodeqa.online/docs/standards/stacks/vscode-extension-package/ |
| TypeScript v1 | published rubric | https://vibecodeqa.online/standards/typescript/v1/ |
| Testing v1 | published rubric | https://vibecodeqa.online/standards/testing/v1/ |
| Security v1 | published rubric | https://vibecodeqa.online/standards/security/v1/ |
| Dependency Hygiene | charter only — `planned`, maturity `draft-charter` | https://vibecodeqa.online/docs/standards/items/dependencies/ |

**Say this plainly: the primary standard is a charter, not a versioned rubric.**
`vscode-extension-package` has `standardUrl: null` and no editions in
`standards/registry.json`. There is no `standards/vscode-extension-package/v1/`
page to score against, and this report does not pretend one exists. What is
scored here is the composite VCQA code-health score plus the three published
cross-cutting rubrics. The charter's five owned rules — activation scope,
workspace trust behaviour, command and webview boundaries, marketplace metadata,
extension test coverage — are demonstrated and evidenced below, but they are
demonstrated *against a charter*, so treat the mapping as a proposal for what a
future rubric should require rather than as a passing grade against one.

## Category scores

| Category | Score | Weight |
| --- | --- | --- |
| Foundations | 100 | 23 |
| Quality | 98 | 20 |
| Testing | 100 | 13 |
| Security | 100 | 16 |
| Architecture | 94 | 9 |
| Other | 98 | 5 |
| LLM Readiness | 100 | 9 |

22 of 38 checks ran; the other 16 are not applicable (no React, no Flutter, no
Dockerfile, no Workers, no D1, no HTML, no frontend components).

## Evidence for the charter's owned rules

| Charter rule | Evidence in this repo |
| --- | --- |
| Activation event scope | [`package.json`](../package.json) declares only `onCommand:refVscodeExt.showWorkspaceSummary` and `onCommand:refVscodeExt.countFilesByGlob`. [`tests/manifest.test.ts`](../tests/manifest.test.ts) fails the build on `*`, on `onStartupFinished`, and on any event that does not map to a contributed command. [`src/integration/extension.test.ts`](../src/integration/extension.test.ts) asserts inside a real VS Code instance that `extension.isActive === false` before any command is invoked. |
| Workspace trust behaviour | `capabilities.untrustedWorkspaces.supported = "limited"` with a written rationale and `restrictedConfigurations`. Every file-system path funnels through the pure [`gateWorkspaceScan`](../src/lib/trust.ts), which returns `blocked/no-workspace` or `blocked/untrusted` and is covered by [`tests/trust.test.ts`](../tests/trust.test.ts). `onDidGrantWorkspaceTrust` is handled so the window recovers without a reload. |
| Command and webview boundaries | Commands validate input via [`src/lib/validate.ts`](../src/lib/validate.ts) (no absolute paths, no `..`, length cap, allow-listed characters) and re-validate settings values. The webview is created with `enableScripts: false`, `enableForms: false`, `enableCommandUris: false`, `localResourceRoots: []`, and a `default-src 'none'; script-src 'none'; style-src 'nonce-…'` CSP. [`tests/webview.test.ts`](../tests/webview.test.ts) asserts the CSP, the absence of any `<script>` or remote URL, and that injected markup comes out inert. |
| Marketplace metadata | `categories`, `keywords`, `engines.vscode`, `publisher`, `repository`, `bugs`, `homepage`, `main`, `displayName`, `description`, namespaced `contributes.commands` and `contributes.configuration`. Release-notes policy is written out in full at the top of [`CHANGELOG.md`](../CHANGELOG.md). |
| Extension test coverage | 48 Vitest tests over pure logic (100% statements/lines, 97.2% branches on `src/lib/**`, thresholds enforced in CI) plus 8 integration tests in a real VS Code host via `@vscode/test-cli` + `@vscode/test-electron`, run under `xvfb-run -a` on `ubuntu-24.04`. |

## CI evidence

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml), green on `main`
([run 31280809121](https://github.com/vibecodeqa/ref-vscode-extension-package/actions/runs/31280809121)):

| Required gate | Step |
| --- | --- |
| Install with a locked package manager | `pnpm install --frozen-lockfile`, `packageManager: pnpm@10.33.3`, committed `pnpm-lock.yaml` |
| Lint | `pnpm lint` (Biome) |
| Typecheck | `pnpm typecheck` (`tsc`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Unit tests | `pnpm test:coverage` — Vitest with enforced thresholds |
| VS Code extension integration tests | `xvfb-run -a pnpm test:integration` on `ubuntu-24.04` |
| Package/build check | `pnpm package` → `vsce package --no-dependencies`, then an assertion that `extension/out/extension.js` is inside the `.vsix` and that no `src/`, `tests/`, `test-fixtures/` or `out/integration/` material leaked into it |
| Packaging artifact | `actions/upload-artifact` publishes `ref-vscode-extension-package.vsix` for 14 days |
| Dependency/audit/license gate | `pnpm audit --audit-level=high` and `node scripts/check-licenses.mjs`, neither with `continue-on-error`; exception policy in [`SECURITY.md`](../SECURITY.md) |

Workflow hygiene: `permissions: contents: read`, all four third-party actions
pinned to full commit SHAs, `persist-credentials: false`, explicit
`timeout-minutes`, and a `concurrency` group.

## Material findings

1. **`@vscode/test-cli` → `mocha` pinned a vulnerable `serialize-javascript`.**
   [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq),
   severity `high`, RCE. The first `pnpm audit` run failed. Fixed with a
   `pnpm.overrides` bump to `^7.1.0` — an override, not a suppression, so the
   advisory is actually gone rather than muted.
2. **`@vscode/vsce-sign*` is proprietary.** It reports as `Unknown` because its
   manifest says `SEE LICENSE IN LICENSE.txt`; the text is Microsoft Software
   License Terms. Recorded as a written exception in
   [`scripts/check-licenses.mjs`](../scripts/check-licenses.mjs) rather than
   allow-listed away. It is build-time only and is never inside the `.vsix`.
3. **`vitest command failed` on the first scan.** The scanner runs
   `npx vitest run --reporter=json --coverage`; `@vitest/coverage-v8` was not
   installed. Real gap, not a scanner artifact — the repo claimed a test layer
   it could not produce coverage for. Fixed, and coverage thresholds are now
   enforced in CI.
4. **The resolver does not detect this repo as a VS Code extension.** See the
   next section. This is the most important finding in the report.

## Resolver gap — `vscode-extension-package` does not fire

`node standards/resolve.mjs <this repo> --json` at the assessed commit returns:

```
slice ref-vscode-extension-package [package]
  archetypes: typescript-sdk:planned
  layers:     (none)
  cross:      typescript:published, security:published, testing:published, dependencies:planned
```

`typescript`, `testing`, `security` and `dependencies` all resolve correctly.
`vscode-extension-package` does **not**, and `typescript-sdk` matches instead.

The cause is in the resolver, not in this repository. The registry's detect
predicate is:

```json
{ "any": [ { "dep": "vscode" }, { "config": "package.json:contributes" } ] }
```

- `{ "dep": "vscode" }` requires a dependency literally named `vscode`. That was
  the pre-2019 `vscode` npm package, which is deprecated; a modern extension
  depends on `@types/vscode`. No correct extension satisfies this today.
- `{ "config": "package.json:contributes" }` can never be true, because
  `signals()` in `standards/resolve.mjs` only ever adds `package.json:bin`,
  `package.json:exportsOrMain`, `package.json`, `pubspec.yaml`, `firebase.json`,
  `melos.yaml` and the three `wrangler.toml:*` keys to the `cfg` set. It never
  emits `package.json:contributes`.

This repo has a real, non-trivial `contributes` block with commands and
configuration, so the intended trigger is present. The one-line fix belongs in
`standards/resolve.mjs`:

```js
if (slice.pkg?.contributes) cfg.add('package.json:contributes');
```

Additionally, `typescript-sdk` matches only because `package.json:exportsOrMain`
is set — and a VS Code extension is *required* to set `main`. Once
`vscode-extension-package` fires this is harmless (archetypes are collected as a
list), but `typescript-sdk`'s detect predicate arguably wants a
`noneDep`/`noneConfig` guard for extensions.

Because `standards/` is owned elsewhere, no change was made there from this
lane. Until that fix lands, issue #19's resolver acceptance criterion is met for
`typescript`, `testing` and `security` but not for `vscode-extension-package`.

## Residual risks — why this is not 100

- **The primary standard is unwritten.** A 99 here is a code-health score plus
  three cross-cutting rubrics. Nothing has graded the extension-specific
  behaviour, because nothing exists to grade it with. The charter is also marked
  maturity `backlog`: nobody is currently working toward a rubric.
- **`src/extension.ts` is reported as an orphan module** (architecture, 90). It
  is correct that nothing imports it — it is the VS Code host entry point,
  loaded through `package.json` `main`. This is a genuine blind spot in
  archetype-agnostic dependency-graph analysis for extension packages, and it is
  exactly the kind of thing a real `vscode-extension-package` rubric would need
  to teach the analyzer.
- **The untrusted-workspace branch is proved by unit test, not end to end.** An
  untrusted VS Code window cannot be scripted from inside the extension host, so
  `gateWorkspaceScan` is verified purely and the manifest declaration is verified
  by assertion. Nobody has watched the real product refuse to scan an untrusted
  folder in CI.
- **Coverage is measured over `src/lib/**` only.** `src/extension.ts` is excluded
  from the Vitest threshold on purpose; folding it in would have produced a
  number rather than a test. Its behaviour is covered by the 8 integration tests,
  which are not coverage-instrumented.
- **One `low` advisory is outstanding** —
  [GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx)
  (`mocha > diff`, DoS). Test tooling only, below the `high` gate threshold, no
  suppression entry needed.
- **TypeScript is pinned at 6.0.3 while 7.0.2 exists** (dependencies, 99).
  Deliberate: `typescript@v1` targets TypeScript 6, and 7 is the native-port
  rewrite. Dependabot will keep raising it; the bump belongs in a change that
  re-verifies the whole toolchain, not in this one.
- **No `CONTRIBUTING.md`, no pre-commit hooks, no commitlint** (best-practices,
  94). Left off deliberately: this is a fixture people fork, and shipping a
  contribution process for a repository that takes no contributions would be
  decoration.
- **Four exported types are unused inside the repo** (dead-code, 98).
  `WorkspaceState`, `GateDecision`, `ValidationResult` and
  `SummaryDocumentOptions` are the documented contracts of their modules; they
  are exported for readers and forkers, not consumed internally.
- **The `.vsix` is built but never published.** Marketplace release is documented
  in [`README.md`](../README.md), not exercised. `private: true` is set and no
  `vsce publish` exists anywhere in this repo.
- **Nothing here has been independently assessed.** The score is self-reported
  from a scanner run on the assessed commit.

## Reproducing this report

```bash
git checkout f8fc51785fbb28767b358c3a69c6775ce4625c62
pnpm install --frozen-lockfile
npx --yes @vibecodeqa/cli@0.54.4 --markdown
node /path/to/vibecodeqa/standards/resolve.mjs . --json
```
