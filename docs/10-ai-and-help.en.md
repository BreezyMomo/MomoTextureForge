# 10 · AI collaboration and help

<!-- doc-language -->
[简体中文](10-ai-and-help.md) · [English](10-ai-and-help.en.md)
<!-- /doc-language -->

[Manual contents](README.en.md) · Previous: [Remote libraries](09-remote-libraries.en.md)

## 1. Toolbar and Help menu

- **Quick guide:** searchable text help inside the editor.
- **Detailed guide ↗:** opens the README and its illustrated tutorial index. Chinese opens Chinese documentation; other interface languages open English documentation.
- **AI tools:** a separate toolbar entry for Skill installation, ZIP downloads, MCP settings, catalog export and project handoff.
- **GitHub repository ↗:** opens source and issue reporting in a new tab.
- **Gitee repository ↗:** opens the mainland source mirror for documentation and downloads; it follows GitHub synchronization.
- **Support:** an independent toolbar entry opens the WeChat appreciation code for voluntary donations toward maintenance and development.

The hand-drawn effect panel offers **Download fill shader reference**, including sources, current settings, mask and comparison images for AI integration. See [Shader reference packages](14-shader-reference.en.md).

In **AI tools → Install and configure**, select an agent and Skills, then **Choose directory and install…** to select and authorize a location in the system dialog. For personal use, follow the recommended path to an existing Skill directory. For a project, choose its root and the tool completes the agent subdirectories. Every installation asks for a directory; canceling does not write files.

The website writes files only; it cannot install runtime dependencies. For first use of the authoring tools, ask AI to set up the runtime following the Skill instructions. Successful file installation does not prove agent activation. See [installation instructions](../skills/texture-forge-author/references/installation.en.md).

**Download ZIP** on the right of each Skill row provides its complete archive for manual extraction and installation. Skills are not graphic resources and should not be imported into the library.

## 2. Give the AI your current graphics catalog

![Export an AI graphics catalog](images/en/ai-catalog.png)

> Callouts: 1 Select catalog scope; 2 Generate the catalog; 3 Copy its contents.

1. Open catalog export through **AI tools → MCP → Export AI graphics catalog**, or search/filter resources in **Graphics library**.
2. Select items, or use the export dialog's scope options for the current results.
3. Choose **Export AI graphics catalog**, then copy the result or download JSON.
4. Provide it together with your goal and relevant reference screenshots.

The catalog contains resource names, categories, parameters and capabilities. It does not contain the current canvas, image pixels or formula source. Supply screenshots separately for visual assessment. Skills do not embed a fixed graphics catalog, which would otherwise recommend resources you may not have loaded.

## 3. Bring AI output back into the tool

- Follow workflow advice in the form “select this node → open this panel → set this parameter → inspect this result.”
- For authoring JSON, use **Create resource → Import files**, select or paste and parse it, inspect the preview, and import.
- Generator JSON can also be entered directly in **Create resource → Generator** to validate code, steps and parameters.
- Use the Image tab for bitmap/SVG background, aspect and contour checks.
- For a complete project ZIP, use **File → Open project**. Nodes, groups, masks, effect order, tracks and dependencies remain editable. Save the project to return revisions to AI.

Successful compilation does not establish visual correctness. Inspect defaults, parameter extremes and multiple times before saving. A retained last-successful frame does not mean the new code compiled.

## 4. Report an issue

Open GitHub from Help and describe the steps, expected versus actual results and browser information, with relevant screenshots. Attach a minimal project or resource pack when possible. Check the files for material you do not intend to publish before submitting.

CLI validation and output examples: [AI authoring CLI](../AI_AUTHORING_CLI.en.md).

The Authoring Skill bundles offline node-authoring tools. After initial runtime setup, AI can query the actual catalog, create or revise native projects and render multiple verification times without opening the website. See the [offline project workflow](../skills/texture-forge-author/references/offline-projects.en.md).

## 5. Give AI direct access to the current web work

Add the Authoring Skill's local MCP (`node /absolute/path/scripts/texforge.mjs mcp`) and ask AI to call `forge_connect`. Use the existing pairing flow in **AI tools → MCP → Connection settings**. Allow local network access if the browser asks. Shared access without per-agent pairing will be revised in a later step. Dependencies are installed once; project ZIP download/upload is unnecessary.

AI calls `forge_capture` to pin the complete main canvas, then reads nodes/effects/tracks/sources/images or renders reference times. Capture again after edits; old snapshots retain their original versions. The connection is read-only. Closing the panel keeps it active; **Disconnect** revokes it. Closing/reloading the page requires pairing again. Exit graphic preview before capturing the main canvas.

See [Live editor and MCP connection](../skills/texture-forge-author/references/live-editor.en.md) for setup, ports, allowed origins and tools. This entry pairs a local MCP client with a browser on the same machine; cloud-only HTTP clients need a separate bridge.
