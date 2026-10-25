# Install and update Skills

<!-- doc-language -->
[简体中文](installation.md) · [English](installation.en.md)
<!-- /doc-language -->

Open **AI tools → Install Skills**, select an agent and Skills, then click **Choose directory and install…** to select and authorize a location in the system dialog. The system directory picker determines the actual installation location. Installation does not change the artwork or agent configuration.

## Recommended directories

- Codex: personal `~/.agents/skills`; project-relative `.agents/skills`.
- Claude Code: personal `~/.claude/skills`; project-relative `.claude/skills`.
- Cursor: personal `~/.cursor/skills`; project-relative `.cursor/skills`.
- Agent Skills: generic `.agents/skills` layout; verify support in the target client.

`~` means the system home directory. Websites cannot obtain its absolute path or automatically navigate there; the panel only recommends a location. Users always choose the actual destination. Installation below an arbitrary test folder does not make a Skill globally available to the agent.

## Choose directory and install

Every install opens the system directory picker. Canceling does not write files. Authorization applies only to the current website and chosen location. Browsers do not expose complete local absolute paths. Completion feedback shows this operation and its destination hierarchy only, and is cleared when the panel closes.

An existing directory named `skills` is used directly. An agent directory such as `.agents` gets a `skills` child. Other directories, such as project roots, get the complete agent path. For example, Codex writes `<selected directory>/.agents/skills/texture-forge-author`. Skill folders are not placed loose in the project root, and `.agents/skills/.agents/skills` is not created. When choosing an existing `skills` directory, confirm that it belongs to the target agent.

Files are written only inside the authorized directory, without manual ZIP extraction. This requires a secure browser environment supporting directory writes. Otherwise click **Download ZIP** next to the corresponding Skill. The website does not save installation directories, keep installation records or scan existing installations when the panel opens. Users select the destination for every installation. The browser may ask for permission again. Grants are not shared across website origins, browsers or private sessions.

## Installation results, updates and backups

The installation section only selects Skills to write. Success or failure feedback describes the current operation, without summarizing other directories. Successful file writes do not establish agent activation or authoring runtime readiness.

Only selected `texture-forge-author` and `texture-forge-effects` subdirectories are managed. Before replacing files, original bytes are backed up in the Skill's `.momo-backups/<batch>/`, with a `.bak` suffix so backups are not discovered as another `SKILL.md`. Additional files, notes and dependencies remain. Write failures attempt to restore previous files and remove newly created files; incomplete rollback reports affected paths.

Reinstalling the same version skips writes; versions use content hashes. Backups are not automatically removed. To restore one, copy its `.bak` file to the original location and remove the suffix. Operations do not move or delete content outside the target Skill directories.

## First use of the authoring tools

After installing the Authoring Skill, continue to step 2 below, copy its startup instructions and send them to your AI. AI follows the Skill to locate its directory, prepare missing runtime/dependencies, start or reuse the local MCP service and verify it. Users do not install prerequisites or execute startup commands themselves. Initial setup may need network access. The Effects Skill is documentation-only and cannot start MCP.

After AI confirms the service is ready, return to step 3: connect the page and copy the configuration into your AI client. Installed files, a running service, a registered page and a configured client are separate states. See [Live editor and MCP connection](live-editor.en.md) for the procedure AI must execute.

**Download ZIP** next to each Skill provides its complete archive with the same files as direct installation. Downloading does not change its checkbox selection. Skills are not graphic resources and should not be imported into the library. If a Skill is missing in the client, check its actual directory or reload the client.

Path sources: [Codex](https://learn.chatgpt.com/docs/build-skills), [Claude Code](https://code.claude.com/docs/en/skills), [Cursor](https://cursor.com/docs/skills). Browser authorization: [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access).
