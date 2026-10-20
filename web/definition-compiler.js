// Pure source assembly also supports a separately loaded definition library.
export const formulaText = (registry, spec) => spec.inline ?? registry.sources[spec.file];
export function patternFunction(registry, indices = null) {
  return `float pattern(int id,vec2 u,vec4 a,vec4 b,vec4 c,vec4 d,float time){vec2 q=u*2.-1.;float r=length(q),angle=atan(q.y,q.x);float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;switch(id){\n` +
    registry.catalog.flatMap((type, index) => {
      if (indices && !indices.includes(index)) return [];
      const spec = type.definition.outputs.scalar, text = formulaText(registry, spec);
      return [spec.kind === "expression" ? `case ${index}:return sat(${text});` : `case ${index}:{${text}}`];
    }).join("\n") + "\ndefault:return 0.;}}";
}
export function extraFormulaLibraries(registry, indices) {
  const names = new Set();
  for (const index of indices) {
    const p = registry.catalog[index].definition;
    for (const spec of [p.outputs.scalar, p.seamless.source].filter(Boolean)) {
      for (const name of spec.libraries) if (!["math-v1", "periodic-v1", "vector-v1"].includes(name)) names.add(name);
    }
  }
  return [...names].map(name => registry.libraries[name]).join("\n");
}
export function vectorCondition(registry, expression) {
  const ranges = [];
  for (const [i, p] of registry.catalog.entries()) {
    if (!p.vector) continue;
    const last = ranges.at(-1);
    if (last && last[1] === i - 1) last[1] = i;
    else ranges.push([i, i]);
  }
  ranges.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
  return ranges.map(([a,b]) => a===b ? `${expression}==${a}` : `${expression}>=${a}&&${expression}<=${b}`).join("||") || "false";
}
