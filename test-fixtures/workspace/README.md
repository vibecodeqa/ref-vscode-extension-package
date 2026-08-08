# Fixture workspace

This folder is opened as the workspace folder by the VS Code integration tests
(`.vscode-test.mjs`). It exists purely so `vscode.workspace.findFiles` has
deterministic content to enumerate. Nothing here is shipped in the `.vsix`.
