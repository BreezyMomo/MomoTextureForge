import { loadDefinitionURL } from "./definition-loader.js";
export const BUILTIN = await loadDefinitionURL(new URL("./definitions/builtin.json", import.meta.url));
export const formulaText = spec => spec.inline ?? BUILTIN.sources[spec.file];
