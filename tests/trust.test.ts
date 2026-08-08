import { describe, expect, it } from "vitest";

import { gateWorkspaceScan, NO_WORKSPACE_MESSAGE, UNTRUSTED_MESSAGE } from "../src/lib/trust";

describe("gateWorkspaceScan", () => {
  it("allows a scan in a trusted workspace with a folder open", () => {
    expect(gateWorkspaceScan({ hasWorkspaceFolder: true, isTrusted: true })).toEqual({
      kind: "allowed",
    });
  });

  it("blocks when no folder is open", () => {
    expect(gateWorkspaceScan({ hasWorkspaceFolder: false, isTrusted: true })).toEqual({
      kind: "blocked",
      reason: "no-workspace",
      message: NO_WORKSPACE_MESSAGE,
    });
  });

  it("blocks an untrusted workspace", () => {
    expect(gateWorkspaceScan({ hasWorkspaceFolder: true, isTrusted: false })).toEqual({
      kind: "blocked",
      reason: "untrusted",
      message: UNTRUSTED_MESSAGE,
    });
  });

  it("reports the missing workspace first when both problems apply", () => {
    expect(gateWorkspaceScan({ hasWorkspaceFolder: false, isTrusted: false })).toMatchObject({
      reason: "no-workspace",
    });
  });
});
