# AI tools development handoff

<!-- doc-language -->
[简体中文](ai-handoff.md) · [English](ai-handoff.en.md)
<!-- /doc-language -->

2026-10-24, development line `main`. Read [AGENTS.en.md](../AGENTS.en.md) before continuing. This document describes the current implementation and product decisions confirmed by the user.

## Current UI and installation flow

- The toolbar's **AI tools** entry has two tabs: **Install and configure** and **MCP**.
- Authoring and Effects Skills each have a **Download ZIP** button on their row. Downloading does not change checkbox selection.
- Installation is one operation: choose agent and Skills → **Choose directory and install…** → select and authorize a directory in the system dialog → receive feedback for this operation.
- There are no personal/project switches, default-directory installation, automatic installer, installation records or persistent installation-status display. Closing the panel clears the result; the old dedicated directory cache is removed.
- The panel recommends paths only. Codex uses `.agents/skills`, Claude Code `.claude/skills`, and Cursor `.cursor/skills`. Existing `skills` directories are used directly; an agent directory gets a `skills` child; other directories get the complete agent path.
- Websites cannot obtain the system home directory or complete local absolute paths. Users always choose the location. Updates retain backups, rollback and additional-file preservation.
- MCP has no duplicate Save current project ZIP button. Project saving uses the original File menu. Graphics catalog export remains available.
- Keep the workflow simple. Do not restore installation management, directory scans, a separate manual-install tab or a separate shader workbench. Do not take fresh screenshots unless requested; when updating tutorials, replace only screenshots that changed.

See [AI collaboration and help](10-ai-and-help.en.md) and [Skill installation](../skills/texture-forge-author/references/installation.en.md).

## Implemented offline tools and MCP

Use `node portable-authoring-cli.mjs` in the repository or `node scripts/texforge.mjs` in the downloaded Skill. Tools validate/render formulas and generators and support `project catalog/schema/create/edit/pack/unpack/inspect/render/check/handoff/shader`. Complete works can be delivered as native project ZIPs that remain editable in the GUI. Shader export currently supplies the existing handdrawn fill reference, rather than a universal full-work game shader converter. See [Offline authoring commands](../AI_AUTHORING_CLI.en.md).

The current MCP entry is `node portable-authoring-cli.mjs mcp`, launched by the AI client over stdio. The Skill's `package.json` declares its SDK and runtime dependencies. Initial setup requires Node.js 22+, npm dependencies and Playwright Chromium.

Eight tools are available: `forge_connect`, `forge_status`, `forge_disconnect`, `forge_capture`, `forge_inspect`, `forge_resource`, `forge_render`, and `forge_guide`.

The current connection still uses a single-use pairing code for one page and read-only main-canvas access. Its local HTTP bridge defaults to `127.0.0.1:8798`. Capture pins a native project snapshot; inspect/resources/GLSL/render use the same `snapshotId`. Capture again after user edits. Reading a project does not imply webpage mutation support; complete authoring/editing currently lives in the offline CLI. See [Live editor and MCP connection](../skills/texture-forge-author/references/live-editor.en.md).

## Follow-up direction

The user prefers pages connected to one local shared service, accessible to AI clients using that MCP, reducing manual project download/upload. The user dislikes per-AI pairing; the current pairing flow is not the final target. Shared service access, multi-page discovery/selection and webpage mutation are not implemented yet. Continue designing toward that direction without assuming those capabilities already exist.

For actual Unity validation, the user designated `E:/MomoDemo`. Read that project's instructions and follow its branch and worktree rules first.

## Code entry points

- `web/ai-tools.js`: unified panel, two tabs, inline ZIP downloads and one-off directory installation.
- `web/agent-install-paths.js`, `web/skill-install.js`: agent paths, destination completion, validation, backups and rollback. Internal update checks do not create a UI installation registry.
- `web/skill-downloads.js`, `build-authoring-kit.mjs`: ZIP files and offline runtime distribution. Skill instructions live in `skills/`; the canonical Chinese entry comes from `web/ai-authoring.js`.
- `web/editor-ai-connection.js`, `web/editor-bridge-protocol.js`: browser connection UI, polling and protocol constants.
- `editor-bridge.mjs`, `editor-mcp.mjs`: local bridge, official SDK stdio server, immutable snapshots and eight MCP tools.
- `portable-authoring-cli.mjs`, `project-authoring-cli.mjs`, `project-cli.mjs`, `web/project-render.js`: offline authoring and shared rendering.
- `web/locales/`: semantic keys for fixed UI text. Maintain both languages and never use translated text to determine behavior.

## Validation and publishing

This handoff has 493 unit tests and 301 builtin definitions. Checks cover source/static installation, ZIP contents, cancellation, backups, two-tab keyboard navigation, bilingual narrow layouts, legacy directory-cache cleanup, the original project-save entry and real SDK MCP against source/static/HTTPS pages. Installation browser tests use disposable OPFS, not real agent directories.

```sh
npm test
npm run validate:definitions
node tests/ai-tools-browser-check.mjs --built
node tests/editor-mcp-browser-check.mjs --built
node tests/ui-language-browser-check.mjs --no-screenshots
node tests/ui-language-browser-check.mjs --built --no-screenshots
node tools/check-docs.mjs
npm run build:pages
```

Regenerate distribution packages after source/Skill changes. Commit `site/` for static deployment; offline outputs are in `dist/`. Do not commit `test-results/`, dependencies or browser profiles. Reports are not distributed with the repository, so another machine must rerun checks. Keep UI and documentation bilingual and update screenshots only as requested.
