# AI tools development handoff

<!-- doc-language -->
[简体中文](ai-handoff.md) · [English](ai-handoff.en.md)
<!-- /doc-language -->

2026-10-24, development line `main`. Read [AGENTS.en.md](../AGENTS.en.md) before continuing. This document describes the current implementation and product decisions confirmed by the user.

## Current UI and installation flow

- The toolbar's **AI tools** entry shows **Install Skills → Ask AI to start MCP → Configure MCP** in one continuous panel, without tabs.
- Authoring and Effects Skills each have a **Download ZIP** button on their row. Downloading does not change checkbox selection.
- Installation is one operation: choose agent and Skills → **Choose directory and install…** → select and authorize a directory in the system dialog → receive feedback for this operation.
- There are no personal/project switches, default-directory installation, automatic installer, installation records or persistent installation-status display. Closing the panel clears the result; the old dedicated directory cache is removed.
- The panel recommends paths only. Codex uses `.agents/skills`, Claude Code `.claude/skills`, and Cursor `.cursor/skills`. Existing `skills` directories are used directly; an agent directory gets a `skills` child; other directories get the complete agent path.
- Websites cannot obtain the system home directory or complete local absolute paths. Users always choose the location. Updates retain backups, rollback and additional-file preservation.
- The webpage keeps project saving in its original File menu; MCP can save a specified snapshot to a host file. Graphics catalog export remains available.
- Keep the workflow simple. Do not restore installation management, directory scans, a separate manual-install tab or a separate shader workbench. Do not take fresh screenshots unless requested; when updating tutorials, replace only screenshots that changed.

See [AI collaboration and help](10-ai-and-help.en.md) and [Skill installation](../skills/texture-forge-author/references/installation.en.md).

The first-use sequence is **Install Skill → Ask AI to start MCP → Configure MCP**. After installing the Authoring Skill, users copy step 2's startup instructions to AI. AI owns runtime checks, missing dependency installation, background startup/reuse and health verification. The webpage must not give beginners Node/npm/Chromium commands or absolute-path placeholders. Step 3 registers the page and provides client configuration. Keep service readiness distinct from client connection and successful reads. Do not turn this into a persistent installation manager or a mandatory locked wizard.

## Implemented offline tools and MCP

Use `node portable-authoring-cli.mjs` in the repository or `node scripts/texforge.mjs` in the downloaded Skill. Tools validate/render formulas and generators and support `project catalog/schema/create/edit/pack/unpack/inspect/render/check/handoff/shader`. Complete works can be delivered as native project ZIPs that remain editable in the GUI. Shader export currently supplies the existing handdrawn fill reference, rather than a universal full-work game shader converter. See [Offline authoring commands](../AI_AUTHORING_CLI.en.md).

The MCP entry `node portable-authoring-cli.mjs mcp` runs an independent shared Streamable HTTP service at `http://127.0.0.1:8798/mcp`. For first use, AI starts or reuses it following the Skill; the local development backend retains its startup endpoint. Runtime dependencies are declared by the Skill package and require Node.js 22+, npm dependencies and Playwright Chromium.

Thirty-nine tools: `forge_pages`, `forge_status`, `forge_capture`, `forge_inspect`, `forge_resource`, `forge_render`, `forge_guide`, `forge_catalog`, `forge_schema`, `forge_edit`, `forge_editor_state`, `forge_history`, `forge_project_open`, `forge_project_save`, `forge_library`, `forge_library_export`, `forge_library_create`, `forge_library_delete`, `forge_library_update`, `forge_library_save_node`, `forge_graphics_list`, `forge_graphics_list_edit`, `forge_library_export_batch`, `forge_library_import`, `forge_library_process_image`, `forge_export_start`, `forge_export_job`, `forge_editor_control`, `forge_deliver`, `forge_examples`, `forge_example_open`, `forge_project_share`, `forge_workspace`, `forge_workspace_edit`, `forge_preview_capture`, `forge_component`, `forge_component_edit`, `forge_remote`, `forge_remote_edit`. Pages register independently, agents share the service, and capture requires an explicit pageId. Snapshot handles are scoped to their source page; disconnecting one page does not affect others. Refresh/close ends page access; enabling again creates a new ID. The shared agent credential persists locally, while page tokens stay in memory. See [Live editor and MCP connection](../skills/texture-forge-author/references/live-editor.en.md).

## Follow-up direction

Shared access, multiple-page discovery, actual graphic queries and atomic webpage editing are implemented. forge_edit checks the snapshot revision and edits the existing canvas by default; create replaces it only for a requested new work. Undo/redo is supported; invalid recipes never partially commit. forge_catalog covers registered page graphics and graphics-list components; forge_library queries builtin/local libraries and cached remote catalogs, and forge_library_export exports a single official resource pack. None automatically downloads external assets; native project JSON/ZIP opens through forge_project_open; authoring JSON and image creation are connected; official ZIP import remains pending. See the [MCP capability matrix](mcp-capabilities.en.md). Do not reintroduce per-agent pairing or a global selected page.

For actual Unity validation, the user designated `E:/MomoDemo`. Read that project's instructions and follow its branch and worktree rules first.

## Code entry points

- `web/ai-tools.js`: unified panel, three sequential steps, inline ZIP downloads and one-off directory installation.
- `web/agent-install-paths.js`, `web/skill-install.js`: agent paths, destination completion, validation, backups and rollback. Internal update checks do not create a UI installation registry.
- `web/skill-downloads.js`, `build-authoring-kit.mjs`: ZIP files and offline runtime distribution. Skill instructions live in `skills/`; the canonical Chinese entry comes from `web/ai-authoring.js`.
- `web/editor-ai-connection.js`, `web/editor-bridge-protocol.js`: browser connection UI, polling and protocol constants.
- `editor-bridge.mjs`, `editor-mcp.mjs`: local bridge, official SDK Streamable HTTP service, immutable snapshots and eighteen MCP tools.
- `portable-authoring-cli.mjs`, `project-authoring-cli.mjs`, `project-cli.mjs`, `web/project-render.js`: offline authoring and shared rendering.
- `web/locales/`: semantic keys for fixed UI text. Maintain both languages and never use translated text to determine behavior.

## Validation and publishing

Run the following checks after source changes. Browser installation tests use disposable OPFS instead of real agent directories. MCP tests cover multiple pages/agents, local startup, immutable snapshots and source/static/HTTPS connections.

```sh
npm test
npm run validate:definitions
node tests/ai-tools-browser-check.mjs --built
node tests/editor-mcp-start-browser-check.mjs
node tests/editor-mcp-browser-check.mjs --built
node tests/ui-language-browser-check.mjs --no-screenshots
node tests/ui-language-browser-check.mjs --built --no-screenshots
node tools/check-docs.mjs
npm run build:pages
```

Regenerate distribution packages after source/Skill changes. Commit `site/` for static deployment; offline outputs are in `dist/`. Do not commit `test-results/`, dependencies or browser profiles. Reports are not distributed with the repository, so another machine must rerun checks. Keep UI and documentation bilingual and update screenshots only as requested.
