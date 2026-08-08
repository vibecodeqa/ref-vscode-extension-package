# Changelog

All notable changes to this extension are documented here.

## Release-notes policy

This file **is** the release notes surface. The VS Code Marketplace renders
`CHANGELOG.md` on the extension's "Changelog" tab, so it is written for users of
the extension, not for maintainers of the repository.

- The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
  and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
- Every released version gets a heading with its ISO date. `Unreleased` collects
  work that has landed on `main` but has not been published.
- Anything a user can observe gets an entry: new or removed commands, changed
  command titles, changed settings, changed activation behaviour, changed
  workspace-trust behaviour, and the minimum `engines.vscode`.
- Changes to activation scope, workspace-trust handling, or the webview security
  boundary are always called out explicitly, because they change what the
  extension is allowed to do on a user's machine.
- Purely internal changes (refactors, CI, test-only changes) are not listed.
- A version is never published without a matching entry here; `package.json`
  `version` and the top released heading must agree.

## [Unreleased]

Nothing yet.

## [0.1.0] - 2026-08-09

### Added

- `VCQA Reference: Show Workspace File Summary` — scans the open workspace and
  renders a breakdown by file extension in a scriptless webview.
- `VCQA Reference: Count Workspace Files By Glob` — prompts for a
  workspace-relative glob, validates it, and reports the match count.
- Settings `refVscodeExt.excludeGlob` and `refVscodeExt.maxResults`.

### Security

- Activation is limited to the two contributed commands; the extension does not
  activate for unrelated workspaces.
- `capabilities.untrustedWorkspaces` is `limited`: in an untrusted workspace both
  commands refuse to read files and show a warning instead.
- The summary webview runs with `enableScripts: false`, `localResourceRoots: []`,
  and a `default-src 'none'; script-src 'none'` content security policy.
