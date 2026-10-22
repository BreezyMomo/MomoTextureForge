# AI command-line rendering

<!-- doc-language -->
[简体中文](AI_AUTHORING_CLI.md) · [English](AI_AUTHORING_CLI.en.md)
<!-- /doc-language -->

Run from the MomoTextureForge repository. Node.js 22+ is required. First install:

```bash
npm ci
npx playwright install chromium
```

On Linux, follow Playwright's instructions for missing system libraries. This browser setup belongs to the CLI; static-site users do not need Node.js or Playwright.

```bash
node authoring-tool.mjs validate my-shape.graphic.json
node authoring-tool.mjs render my-shape.graphic.json --time 1.5 --size 512 --output preview.png
node authoring-tool.mjs check my-shape.graphic.json --times 0,0.25,0.5,1,2 --size 256 --output previews
```

- `validate`: structure and bindings only.
- `render`: transparent PNG and matching `.report.json`.
- `check`: transparent `frame-00.png` files, a time-labeled dark-background `contact-sheet.png`, and `report.json`.
- `--size`: integer 16–2048, default 512. `check` supports up to 16 frames.
- `--timeout`: rendering timeout in milliseconds, default 60000, range 1000–300000. Browser startup has a separate timeout of the same value.
- Rendering uses parameter defaults. To inspect ranges, change JSON defaults and rerun.
- The browser and temporary local HTTP server close on completion. The CLI does not modify the library or upload content.

Exit status is 0 on success, 1 on failure. Report fields `ok`, `frames` and `error` describe this run. Old images may remain in the output folder; do not mistake them for a successful new result after failure. Compiler line numbers refer to generated GLSL, not directly to the authoring source. Structure/GPU success does not establish visual correctness: `visual` remains `not-reviewed`, and the AI must inspect generated images before judging them. GPUs can differ slightly in pixels.

Workflow: write authoring JSON → validate → render/check → read the report and inspect images → revise → rerun → deliver the final JSON for import.

End users should download the **Authoring Skill** from Help. Its ZIP includes `SKILL.md`, specifications, examples, `scripts/texforge.mjs` and a standalone renderer, without requiring this repository. Extract it and let the AI read the Skill entry. Install dependencies in the Skill folder, then run `node scripts/texforge.mjs render/check`. Browser binaries are installed on first setup, not bundled in the ZIP. Developers can rebuild with `node authoring-tool.mjs build-kit`; static builds regenerate the kit automatically.
