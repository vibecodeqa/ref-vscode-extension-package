# Security policy

This is a product-neutral reference template. It holds no secrets, ships no
credentials, and talks to no network service.

## Reporting

Report vulnerabilities through GitHub security advisories on this repository.
Please do not open a public issue for an unfixed vulnerability.

## Extension security boundaries

| Boundary | How it is enforced | Where |
| --- | --- | --- |
| Activation scope | Only `onCommand:` events for the two contributed commands. No `*`, no `onStartupFinished`, no `workspaceContains:`. Asserted in tests. | `package.json`, `tests/manifest.test.ts` |
| Workspace trust | `capabilities.untrustedWorkspaces.supported = "limited"`. The extension loads in an untrusted window but every file-system path goes through one gate that refuses to run. | `src/lib/trust.ts`, `src/extension.ts` |
| Missing workspace | The same gate returns a `no-workspace` block and shows a warning instead of throwing. | `src/lib/trust.ts` |
| Untrusted input | User-supplied globs are validated: no absolute paths, no `..` traversal, length-capped, allow-listed character set. Settings values are re-validated even though they are `restrictedConfigurations`. | `src/lib/validate.ts`, `src/extension.ts` |
| Webview | `enableScripts: false`, `enableForms: false`, `enableCommandUris: false`, `localResourceRoots: []`, plus `default-src 'none'; script-src 'none'; style-src 'nonce-…'`. All interpolated values are HTML-escaped. | `src/lib/webview.ts`, `src/extension.ts` |
| File-system reach | Only `vscode.workspace.findFiles`, which cannot leave the workspace. No `node:fs` use at runtime. | `src/extension.ts` |

## Dependency, audit, and license policy

The extension has **zero runtime dependencies**; everything in `devDependencies`
is build- or test-time only and none of it is shipped in the `.vsix`
(`vsce package --no-dependencies`).

CI runs two supply-chain gates on every push and pull request:

- **`pnpm audit --audit-level=high`** — fails the build on a `high` or
  `critical` advisory. `moderate` and below are reported but do not block.
- **`node scripts/check-licenses.mjs`** — fails the build on any license outside
  the permissive allow-list in that script.

### Exception policy

There is no "skip the gate" flag and no `continue-on-error` on either step.

- A license exception is a reviewed commit that adds a package-name prefix to the
  `EXCEPTIONS` map in `scripts/check-licenses.mjs` with a written reason.
- An audit exception is a reviewed commit that adds a `pnpm.auditConfig.ignoreCves`
  entry in `package.json` together with a note here explaining why the advisory
  does not reach this code. Prefer fixing the advisory with a `pnpm.overrides`
  entry; an exception is the last resort.

Both mechanisms leave the exception visible in version control and in code
review. Suppressing a finding by disabling the step is not permitted.

### Current exceptions and overrides

- **License exception — `@vscode/vsce-sign*`.** Proprietary "Microsoft Software
  License Terms", reported by `pnpm licenses list` as `Unknown` because the
  manifest says `SEE LICENSE IN LICENSE.txt`. It is a build-time transitive
  dependency of `@vscode/vsce`, licensed for use with Visual Studio products,
  and never shipped inside the `.vsix`.
- **Override, not exception — `serialize-javascript`.**
  [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq) is a
  `high` RCE advisory reached through `@vscode/test-cli > mocha`, which pins
  `^6.0.2`. `pnpm.overrides` forces `^7.1.0` (still CommonJS, API-compatible),
  so the advisory is removed rather than suppressed. The integration suite is
  the regression test for the bump.
- **Audit exceptions — none.** One `low` advisory is currently outstanding
  ([GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx),
  `mocha > diff`). It is below the `high` gate threshold, is test-tooling only,
  and needs no suppression entry — the gate reports it and does not block.
