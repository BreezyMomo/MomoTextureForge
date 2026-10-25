# Current MCP capabilities and boundaries

<!-- doc-language -->
[简体中文](mcp-capabilities.md) · [English](mcp-capabilities.en.md)
<!-- /doc-language -->

[AI workflow](10-ai-and-help.en.md) · [Tool parameters and connection protocol](../skills/texture-forge-author/references/live-editor.en.md) · [Service implementation](../editor-mcp.mjs)

This page describes implemented structured MCP capabilities by workflow. The running service's tool list and connected page's schema determine availability; updating files on disk does not hot-load new tools into an old process. This is not a history of acceptance counts or a claim to cover every parameter combination, platform or engine.

## Connection and versions

First use follows **Install Authoring Skill → Ask AI to start MCP → Configure MCP** in one AI tools panel. Both the editor and AI client connect to the same local service, listening on `127.0.0.1:8798` by default. Static websites and offline HTML can connect; the webpage does not listen as a local server. AI prepares initial dependencies following the Skill rather than asking users to install prerequisites manually.

Use `forge_pages` to identify a user-enabled page, then capture its explicit `pageId`. For updated tools/business logic, update the Skill, restart the service and refresh the client's tool list; changed page logic also requires refreshing and reconnecting the editor. See [connection protocol](../skills/texture-forge-author/references/live-editor.en.md) for configuration, health checks, origins and custom ports.

## Tools by workflow

| Workflow | Main tools | Current scope and limits |
| --- | --- | --- |
| Page discovery and service status | forge_pages / forge_status | Only user-enabled pages; identify name, origin and pageId when multiple targets exist rather than selecting the first. |
| Pin work and read dependencies | forge_capture / forge_inspect / forge_resource / forge_render | One snapshotId pins nodes, resources and rendering. Reference rendering is distinct from full export. |
| Create or edit work | forge_schema / forge_catalog / forge_edit | Query actual graphics, variables and operations; atomic recipes and undo. Default edit preserves work; create requires a request for new work. Switch graphics with set-graphic. |
| Editor state and project files | forge_editor_state / forge_history / forge_project_open / forge_project_save / forge_project_share | Read selection/playback/history, versioned undo/redo, native JSON/ZIP open/save; preserve the personal graphics list. Share links do not carry arbitrary custom dependencies; use a project ZIP when needed. |
| Examples, selection and previews | forge_examples / forge_example_open / forge_editor_control / forge_preview_capture | Actual composition examples, selection/multiselection, playback/seek, 2D/3D/FX settings and captures. Work mutations still require the requested scope. |
| Parameters, arrangement, effects and animation | forge_edit | Native parameters, transforms, masks, arrangement/expansion, Bezier, color/curves, effect ordering, tracks/keys and templates. Query schema; do not invent fields or bypass controlled parameters. |
| Timeline and inspector | forge_timeline / forge_timeline_edit / forge_inspector / forge_inspector_edit | Scope, track filters, zoom, selected keys, tabs, module order/expansion and pins. Interface preferences are separate from projects. |
| Workspace and appearance | forge_workspace / forge_workspace_edit / forge_editor_control | Docking/floating/dividers, named layouts, language and registered themes/styles/density; do not clear browser preferences on the user's behalf. |
| Library queries and export | forge_library / forge_library_export / forge_library_export_batch | Builtin/local/loaded remote resources, parameters/sources, native ZIPs and AI catalogs. forge_catalog reads the loaded registry, not the entire personal library. AI catalogs exclude current work and complete pixels/source. |
| Resource creation and updates | forge_library_create / forge_library_update / forge_library_edit_resource / forge_library_process_image / forge_library_save_node / forge_library_aliases / forge_library_delete | Formula/generator, bitmap/SVG processing, saved nodes and graphic/parameter aliases. Supported previewOnly operations render before saving. Updates/deletions follow resource references and versions. |
| Imports and graphics list | forge_library_import / forge_graphics_list / forge_graphics_list_edit / forge_graphics_list_batch / forge_graphics_list_job / forge_list_view / forge_list_view_edit | Native imports, backup restoration, list editing/favorites/filters, batch progress and cancellation. Keep library originals, reusable copies and canvas instances distinct. |
| Component trials | forge_component / forge_component_edit / forge_capture(context:component) | Enter, edit, return, insert and update. Trial revisions and canvas snapshots are separate; component snapshots cannot authorize main-canvas writes. |
| Image and animation delivery | forge_export_start / forge_export_job | PNG8/16, EXR, frames/atlases, three-size batches, GIF, PSD, SVG/vector PSD and RGBA channels. Native dimensions/frame/budget rules apply; progress, cancellation and diagnostics are available. |
| Shaders and implementation references | forge_deliver | Query shader-support, then choose realtime or postprocess as described below. Handoff delivers source, guidance and references, not completed engine adaptation. |
| Remote subscriptions | forge_remote / forge_remote_edit / forge_remote_job | Query/add/remove/enable, refresh, download and cache management. Background jobs support cancellation; committed changes are not rolled back by cancellation. |
| Host library directories | forge_directory_open / forge_directory | An explicit user-specified absolute host directory yields a handle for indexes, import preview/commit, metadata, withdrawal/restoration and cleanup. Browser folder access is not inherited; no automatic upload/publication. See the protocol for resource ABI limits. |
| Help, Skills and catalog data | forge_help / forge_guide / forge_library_export | Relevant guides, Skill packages and actual library catalogs. Documentation does not authorize unrelated pages, directories or client-configuration changes. |

## Shader delivery scope

- **realtime:** reviewed analytic graphics and supported composition/parameters/continuous seconds. See [Realtime project shaders](../skills/texture-forge-author/references/realtime-shaders.en.md) for actual adapters and transform/color/mask limits. Arbitrary graphics, keyframes and all web post effects are not covered.
- **postprocess:** unified RGBA input → automatic contours/fill → output. Images, external RTs and reviewed producers share one handdrawn core. `handdrawnInput` selects auto/texture/generator/external. Auto never silently freezes unsupported animation; unsupported styles, parameters and later effects block export. See [Handdrawn postprocess](../skills/texture-forge-author/references/handdrawn-postprocess.en.md).
- Retired handdrawn, dynamic-handdrawn and light/frozen exports return migration errors rather than compatibility renderers. See [Shader extension rules](../skills/texture-forge-author/references/shader-architecture.en.md) for module boundaries.
- Packages record actual parameters, source project, input, dependencies, integrity and references. Browser success is separate from target-Unity verification. Exporter engine status remains not-run; consumers separately record engine version, compilation, visuals/playback and platform results.

## Mutation and file boundaries

Read requests do not authorize writes. Read fresh state and revision/snapshot before structured changes; capture again after user edits. If a write response is lost, times out or is canceled, inspect actual state before retrying rather than repeating imports/creation blindly. Read back and render after edits. Canceling a batch does not undo its completed prefix.

Closing the connection dialog keeps access active; Disconnect affects that page and its snapshots only, while page refresh/close requires enabling again. Do not connect other tabs, scan entire user libraries, run arbitrary code or substitute for OS file pickers/external engine compilation. Artifact paths belong to the MCP host; remote execution environments may need client file transfer. Commit, push, deletion and publication follow user requests.

## Verification entry points

[Project/MCP unit checks](../tests/editor-mcp-project.test.mjs) cover versions and native actions. [Isolated live SDK checks](../tests/editor-mcp-browser-check.mjs) exercise source, static and HTTPS workflows with separate pages/services. [Portable handdrawn Skill checks](../tests/handdrawn-postprocess-portable-check.mjs) verify actual downloaded-package delivery. See [Development and deployment](development.en.md) for commands. Tests use isolated environments rather than the user's active canvas.
