import { writeFile } from "node:fs/promises";
import { CATALOG } from "../web/catalog.js";
import { VERTEX_GLSL, fragmentGLSL } from "../web/renderer.js";
import { defaults, newLayer } from "../web/state.js";
import { prepareSeamlessState, seamlessKind } from "../web/seamless.js";
const file = process.argv[2];
const seamless = process.argv.includes("--seamless");
if (!file) throw new Error("Provide shader JSON output path");
await writeFile(
  file,
  JSON.stringify({
    vertex: VERTEX_GLSL,
    seamless,
    patterns: CATALOG.map((t, i) => {
      const s = defaults();
      s.output.seamless = seamless;
      s.layers[0] = newLayer(t.id);
      const layer = prepareSeamlessState(s).layers[0];
      return {
        name: t.id,
        params: layer.params,
        uv: layer.uv,
        kind: seamless ? seamlessKind(t.id) : 0,
        parameters: t.parameters,
        index: i,
        fragment: fragmentGLSL([i], 0, seamless ? 0 : -1),
      };
    }),
    combined: fragmentGLSL([0, 1, 141]),
  }),
);
