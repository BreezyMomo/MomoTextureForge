import { BY_ID } from "./catalog.js";
import { BUILTIN, formulaText } from "./definition-runtime.js";
import { effectiveArrangement, arrangementDescription } from "./arrangement.js";

export const PERIODIC_PATTERNS = new Set(BUILTIN.catalog.filter(p => p.definition.seamless.kind === "periodic").map(p => p.id));
export const REPEATED_SHAPES = new Set(BUILTIN.catalog.filter(p => p.definition.seamless.kind === "repeat").map(p => p.id));
export function seamlessKind(type, mode = 0) {
  return mode === 1
    ? 0
    : BY_ID.get(type)?.definition.seamless.kind === "periodic"
      ? 1
      : BY_ID.get(type)?.definition.seamless.kind === "repeat"
        ? 2
        : 0;
}
export function shapeExtent(type, p) {
  const shape = BY_ID.get(type).definition.seamless.extent;
  if (shape === "bezier") return Math.max(...[0, 2, 4, 6].map((i) => Math.hypot(p[i], p[i + 1]))) + Math.max(p[8], p[9]) * 0.5 + p[10];
  const [r, w, , s, d, k] = p;
  if (shape === "profile") return Math.hypot(r, w * 2 * (1 + Math.abs(p[6])) + Math.abs(k) * r) + s;
  let radius = r;
  if (shape === "ring") radius += w;
  if (shape === "rectangle") radius = Math.hypot(r, k);
  if (shape === "cross") radius = Math.hypot(r, w);
  if (shape === "ellipse") return (r + s) * Math.max(1, d);
  if (shape === "polygon") return (r + s) / Math.cos(Math.PI / paramsCount(p));
  if (shape === "capsule") radius = r * 0.5 + w;
  if (shape === "heart") radius *= 1.21;
  return radius + s;
}
function paramsCount(p) {
  return Math.max(3, p[2]);
}
export function effectiveSeamlessPattern(type, params, uv, mode = 0) {
  const p = [...params],
    v = [...uv],
    kind = seamlessKind(type, mode);
  if (kind === 1) {
    const policy = BY_ID.get(type).definition.seamless, countSlot=policy.countSlot??2;
    let count = Math.max(
      1,
      Math.min(512, Math.round((p[countSlot] * policy.countMultiplier) / v[0])),
    );
    if (policy.evenCount && (type !== 'Dots' || p[4] > 0)) count = Math.max(2, Math.ceil(count / 2) * 2);
    p[countSlot] = count;
    if (policy.rows) {
      p[0] = Math.max(1, Math.min(512, Math.round(p[0] / v[0])));
      if (p[5] > 0) p[0] = Math.max(2, Math.ceil(p[0] / 2) * 2);
    }
    v[0] = 1;
    v[1] = Math.round(v[1] / 90) * 90;
    v[6] = 0;
  } else if (kind === 2) {
    // A compact circumscribed shape has a unique closest periodic copy at each pixel.
    v[0] = Math.min(v[0], 0.9 / Math.max(shapeExtent(type, p), 0.01));
    v[6] = 0;
  }
  return { kind, params: p, uv: v };
}
export function prepareSeamlessState(state) {
  if (!state.output.seamless) return state;
  const s = structuredClone(state);
  for (const l of s.layers) {
    const main = effectiveSeamlessPattern(
      l.type,
      l.params,
      l.uv,
      s.output.seamMode,
    );
    l.arrange = effectiveArrangement(l.arrange, true);
    l.maskArrange = effectiveArrangement(l.maskArrange, true);
    if (!l.arrange[0]) {
      l.params = main.params;
      l.uv = main.uv;
      if (main.kind !== 0) l.polar = false;
    }
    if (l.mask) {
      const mask = effectiveSeamlessPattern(
        l.mask,
        l.maskParams,
        l.maskUV,
        s.output.seamMode,
      );
      if (!l.maskArrange[0]) {
        l.maskParams = mask.params;
        l.maskUV = mask.uv;
      }
    }
  }
  return s;
}
export function seamlessDescription(layer, mode = 0) {
  if (layer.arrange?.[0]) return arrangementDescription(layer.arrange, true);
  const p = effectiveSeamlessPattern(layer.type, layer.params, layer.uv, mode);
  if (p.kind === 2) return `形状跨边缘重复 · 实际缩放 ${p.uv[0].toFixed(2)}`;
  if (p.kind === 0) return "边缘融合（可能产生模糊或重影）";
  const count =
    layer.type === "Brick"
      ? `${p.params[2]} 列 × ${p.params[0]} 行`
      : `周期数量 ${p.params[BY_ID.get(layer.type).definition.seamless.countSlot??2]}`;
  return `周期生成 · ${count} · 实际旋转 ${p.uv[1]}°`;
}

// Independently authored periodic lattice sampling; no external shader dependency.
export const PERIODIC_GLSL = BUILTIN.libraries["periodic-v1"];
export function periodicPatternGLSL(indices, registry = BUILTIN) {
  const cases = registry.catalog.filter(p => p.definition.seamless.kind === "periodic")
    .sort((a,b) => a.definition.seamless.order - b.definition.seamless.order)
    .filter(p => indices.includes(BY_ID.get(p.id).index))
    .map(p => {
      const spec = p.definition.seamless.source, expression = spec.inline ?? registry.sources[spec.file];
      return spec.kind === "expression"
        ? `if(id==${BY_ID.get(p.id).index})return ${expression};`
        : `if(id==${BY_ID.get(p.id).index}){${expression}}`;
    }).join("\n");
  return `float periodicPattern(int id,vec2 u,vec4 a,vec4 b,float time){float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;${cases}return 0.;}`;
}
