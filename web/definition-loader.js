import {formulaUsesTime} from './formula-time.js';
import { validateLibrary, validateIndex, validateFormula, sourcePath, INDEX_SCHEMA, LIBRARY_SCHEMA } from "./definition-schema.js";

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
async function readFiles(files, readSource, label) {
  const sources = {};
  const pending = [...files];
  await Promise.all(Array.from({length:Math.min(8, pending.length)}, async () => {
    while (pending.length) {
      const file = pending.shift();
      try {
        const text = await readSource(file);
        if (typeof text !== "string" || !text.trim() || text.length > 1048576) throw new Error("文件为空或超过大小限制");
        sources[file] = text.replaceAll("\r\n", "\n");
      } catch (error) { throw new Error(`无法加载${label} ${file}：${error.message}`, {cause:error}); }
    }
  }));
  return sources;
}
// Resolve each pattern's local paths into the library namespace before publishing.
// Inline library/v1 remains supported for existing API/CLI callers.
export async function loadDefinitions(manifest, readSource) {
  let index = null, configFiles = [];
  if (manifest?.schema === INDEX_SCHEMA) {
    index = structuredClone(validateIndex(manifest));
    configFiles = index.patterns.map(entry => entry.file);
    const texts = await readFiles(configFiles, readSource, "图案配置");
    const patterns = index.patterns.map(entry => {
      let pattern;
      try { pattern = JSON.parse(texts[entry.file]); }
      catch (error) { throw new Error(`图案配置 ${entry.file} JSON 无效：${error.message}`, {cause:error}); }
      if (!pattern || pattern.id !== entry.id) throw new Error(`图案配置 ${entry.file} ID 与索引 ${entry.id} 不符`);
      const prefix = entry.file.slice(0, entry.file.lastIndexOf("/") + 1);
      for (const spec of [pattern.outputs?.scalar, pattern.seamless?.source].filter(Boolean)) {
        if (Object.hasOwn(spec, "file")) spec.file = prefix + sourcePath(spec.file);
      }
      return pattern;
    });
    manifest = {...index, schema:LIBRARY_SCHEMA, patterns};
  }
  const definition = structuredClone(validateLibrary(manifest));
  const files = new Set(Object.values(definition.libraries).map(l => l.file));
  for (const p of definition.patterns) {
    for (const spec of [p.outputs.scalar, p.seamless.source].filter(Boolean)) if (spec.file) files.add(spec.file);
  }
  // Both stages bound concurrent reads; each unique resource is loaded once.
  const sources = await readFiles(files, readSource, "公式");
  const source = spec => validateFormula(spec.inline ?? sources[spec.file], spec.kind, spec.file ?? "内联公式");
  for (const p of definition.patterns) {
    source(p.outputs.scalar);
    if (p.seamless.source) source(p.seamless.source);
  }
  const libraries = Object.fromEntries(Object.entries(definition.libraries).map(([name, spec]) => [name, sources[spec.file]]));
  const catalog = definition.patterns.map(p => {
    const category = definition.categories.findIndex(c => c.id === p.category);
    return {usesTime:formulaUsesTime(p,sources,libraries),id:p.id, zh:p.name, category, categoryName:definition.categories[category].name, variant:p.variant, vector:!!p.outputs.vector, parameters:p.parameters, defaults:p.defaults, definition:p};
  });
  const categories = definition.categories.map((c, category) => ({name:c.name, category, count:catalog.filter(p=>p.category===category).length}));
  const indices = new Map(catalog.map((p,i)=>[p.id,i]));
  const vector = (libraries["vector-v1"] ?? "").replace(/\{\{id:([A-Za-z]\w*)\}\}/g, (_,id) => {
    if (!indices.has(id)) throw new Error(`矢量函数库引用未知图案 ${id}`);
    return indices.get(id);
  });
  if (/\{\{/.test(vector)) throw new Error("矢量函数库含未知占位符");
  return freeze({index, configFiles, definition, sources, libraries, vector, catalog, categories});
}
export async function loadDefinitionURL(url, readText) {
  if (!readText) readText = async target => {
    if (target.protocol === "file:") {
      const {readFile} = await import("node:fs/promises");
      return readFile(target, "utf8");
    }
    const response = await fetch(target);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  };
  const manifest = JSON.parse(await readText(url));
  return loadDefinitions(manifest, file => readText(new URL(file, url)));
}
