#!/usr/bin/env node
/**
 * License gate.
 *
 * Reads `pnpm licenses list --json` and fails if any installed package carries a
 * license that is not on the allow-list and not on the reviewed-exception list.
 * The exception list is deliberately in version control: an exception has to be
 * a reviewed commit, never a silently skipped step.
 *
 * Policy is documented in SECURITY.md.
 */

import { execFileSync } from "node:child_process";

/**
 * SPDX identifiers that need no case-by-case review: permissive or
 * attribution-only, no source-disclosure obligation on a consumer.
 */
const ALLOWED = new Set([
  "0BSD",
  "Apache-2.0",
  "Artistic-2.0",
  "BlueOak-1.0.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC0-1.0",
  "CC-BY-3.0",
  "CC-BY-4.0",
  "ISC",
  "MIT",
  "MIT-0",
  "MPL-2.0",
  "Python-2.0",
  "Unlicense",
  "WTFPL",
  "Zlib",
]);

/**
 * Reviewed exceptions: package-name prefix -> reason. Every entry is a
 * deliberate decision recorded in git history and visible in code review;
 * there is no way to silence a finding without adding a line here.
 */
const EXCEPTIONS = new Map([
  [
    "@vscode/vsce-sign",
    "Proprietary 'Microsoft Software License Terms' (reported as Unknown because the manifest says 'SEE LICENSE IN LICENSE.txt'). Build-time only: pulled in by @vscode/vsce, licensed for use with Visual Studio products, and never shipped inside the .vsix.",
  ],
]);

/** Matches a package against the exception list, allowing platform-suffixed variants. */
function exceptionFor(name) {
  for (const [prefix, reason] of EXCEPTIONS) {
    if (name === prefix || name.startsWith(`${prefix}-`)) return reason;
  }
  return undefined;
}

function readLicenses() {
  const raw = execFileSync("pnpm", ["licenses", "list", "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(raw);
}

/** Splits composite SPDX expressions such as "(MIT OR Apache-2.0)". */
function termsOf(license) {
  return license
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND|WITH)\s+/i)
    .map((term) => term.trim())
    .filter(Boolean);
}

function isAcceptable(license) {
  const terms = termsOf(license);
  if (terms.length === 0) return false;
  // "A OR B" is fine if any branch is allowed; "A AND B" needs every branch.
  return /\sOR\s/i.test(license)
    ? terms.some((term) => ALLOWED.has(term))
    : terms.every((term) => ALLOWED.has(term));
}

const byLicense = readLicenses();
const violations = [];
let inspected = 0;

for (const [license, packages] of Object.entries(byLicense)) {
  for (const pkg of packages) {
    inspected += 1;
    if (isAcceptable(license)) continue;
    const reason = exceptionFor(pkg.name);
    if (reason) {
      console.log(`exception: ${pkg.name} (${license}) — ${reason}`);
      continue;
    }
    violations.push(`${pkg.name}@${(pkg.versions ?? []).join(",")}: ${license}`);
  }
}

console.log(`Checked ${inspected} package(s) across ${Object.keys(byLicense).length} license(s).`);

if (violations.length > 0) {
  console.error("\nDisallowed licenses found:");
  for (const violation of violations) console.error(`  - ${violation}`);
  console.error(
    "\nAdd the SPDX id to ALLOWED, or record a reviewed exception in EXCEPTIONS in scripts/check-licenses.mjs.",
  );
  process.exit(1);
}

console.log("License gate passed.");
