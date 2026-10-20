import { BY_ID, PALETTES } from "./catalog.js";
import { arrangementSpec, defaultArrangement, sanitizeArrangement } from "./arrangement.js";
export const VERSION = 5;
export const UV_PARAMS = [
  ["缩放", 0.1, 8, 0.01],
  ["旋转 °", -360, 360, 1],
  ["偏移 X", -2, 2, 0.01],
  ["偏移 Y", -2, 2, 0.01],
  ["滚动速度", -2, 2, 0.01],
  ["滚动方向 °", -360, 360, 1],
  ["漩涡", -6.28, 6.28, 0.01],
];
export const MODES = [
  "图案配色",
  "高度灰度",
  "法线 Sobel",
  "RGBA 通道",
  "翻转书",
];
export const BLENDS = [
  "正常",
  "相加",
  "正片叠底",
  "滤色",
  "差值",
  "遮罩",
  "叠加",
  "柔光",
  "颜色减淡",
];
const clone = (value) => structuredClone(value);
export const defaultUV = () => [1, 0, 0, 0, 0, 0, 0];
export function newLayer(type = "Circle", enabled = true) {
  return {
    type,
    enabled,
    params: [...BY_ID.get(type).defaults],
    uv: defaultUV(),
    polar: false,
    blend: 0,
    opacity: 1,
    mask: "",
    maskInvert: false,
    maskUV: defaultUV(),
    maskParams: [...BY_ID.get("Circle").defaults],
    arrange: defaultArrangement(),
    maskArrange: defaultArrangement(),
  };
}
export function defaults() {
  return {
    version: VERSION,
    layers: [newLayer(), newLayer("FBM", false), newLayer("Ring", false)],
    order: [0, 1, 2],
    palette: 0,
    stops: clone(PALETTES[0].stops),
    post: [0, 1, 1, 0, 1, 0, 1],
    output: {
      mode: 0,
      resolution: 1024,
      aspect: 1,
      custom: false,
      width: 1024,
      height: 1024,
      invert: false,
      alpha: false,
      precision: 8,
      normal: 3,
      channels: [0, 0, 0, 6],
      exrZip: true,
      seamless: false,
      seamMode: 0,
      seamBlend: 0.2,
    },
    animation: {
      duration: 3,
      speed: 1,
      time: 0,
      pingpong: false,
      ease: "linear",
      enabled: true,
      tracks: {},
    },
    flipbook: { columns: 4, rows: 4, cell: 256 },
    keep: false,
  };
}
export const finite = (value, fallback, min, max) =>
  Number.isFinite(Number(value))
    ? Math.min(max, Math.max(min, Number(value)))
    : fallback;
const arrayNumbers = (value, base, specs) =>
  base.map((n, i) => finite(value?.[i], n, specs[i][1], specs[i][2]));
export function parameterSpec(type, slot) {
  return BY_ID.get(type)?.parameters.find((p) => p.slot === slot);
}
export function fieldSpec(layer, field, slot) {
  if (field === "arrange" || field === "maskArrange") return arrangementSpec(12, slot, layer[field]);
  return parameterSpec(field === "params" ? layer.type : layer.mask || "Circle", slot);
}
export function patternParameters(type, values) {
  const definition = BY_ID.get(type),
    result = [...definition.defaults];
  for (const p of definition.parameters) {
    const value = finite(values?.[p.slot], p.default, p.min, p.max);
    result[p.slot] = p.step === 1 ? Math.round(value) : value;
  }
  return result;
}
function migrateParameters(type, values) {
  const p = Array.isArray(values) ? [...values] : [...BY_ID.get(type).defaults];
  // Newly meaningful slots must not interpret v1's unused generic values.
  if (type === "Circle") p[1] = 0;
  if (type === "RadialGradient" || type === "Vignette") p[4] = 1;
  if (type === "Polygon") p[5] = 0;
  if (type === "Star") p[4] = 0.3;
  if (type === "RoundedRect") {
    p[5] = finite(p[0], 0.62, 0.02, 1.5) * 0.7;
    p[4] = finite(p[4], 0.5, 0, 1) * 0.2;
  }
  if (type === "Gear") {
    p[1] = 0;
    p[4] = finite(p[0], 0.62, 0.02, 1.5) * 0.24;
  }
  if (type === "Ellipse") p[4] = finite(p[4], 0.5, 0, 1) + 0.3;
  if (type === "Capsule") p[1] = finite(p[0], 0.62, 0.02, 1.5) * 0.3;
  if (type === "Checker") p[3] = 0;
  if (type === "Brick") {
    p[0] = Math.max(1, Math.round(finite(p[2], 8, 1, 64) * 0.5));
    p[5] = 0.5;
  }
  if (type === "LinearGradient") {
    p[1] = 0;
    p[5] = 0;
  }
  if (type === "ValueNoise") p[0] = 1;
  if (type === "FBM") {
    p[0] = 5;
    p[4] = 0.5;
  }
  if (BY_ID.get(type).vector) {
    p[0] = 1;
    if (type === "DirectionalFlow") p[5] = 0;
  }
  return p;
}
function migrateGearProfile(type, values, version) {
  if (type === "Star" && version < 5) {
    const p = [...(Array.isArray(values) ? values : BY_ID.get(type).defaults)];
    p[1] = 0;
    p[5] = 2;
    return p;
  }
  if (type !== "Gear" || version >= 3) return values;
  const p = [...(Array.isArray(values) ? values : BY_ID.get(type).defaults)];
  p[5] = 0.5;
  p[6] = 1;
  return p;
}
export function sanitize(raw) {
  if (
    !raw ||
    typeof raw !== "object" ||
    ![1, 2, 3, 4, VERSION].includes(raw.version)
  )
    throw new Error("不支持的配置版本（支持 version: 1/2/3/4/5）");
  const legacy = raw.version === 1;
  const s = defaults();
  s.layers = s.layers.map((base, i) => {
    const r = raw.layers?.[i] || {};
    const type = BY_ID.has(r.type) ? r.type : base.type;
    return {
      ...newLayer(type, i === 0),
      enabled: i === 0 || r.enabled === true,
      params: patternParameters(
        type,
        migrateGearProfile(
          type,
          legacy ? migrateParameters(type, r.params) : r.params,
          raw.version,
        ),
      ),
      uv: arrayNumbers(r.uv, base.uv, UV_PARAMS),
      polar: r.polar === true,
      blend: Math.round(finite(r.blend, 0, 0, 8)),
      opacity: finite(r.opacity, 1, 0, 1),
      mask: BY_ID.has(r.mask) ? r.mask : "",
      maskInvert: r.maskInvert === true,
      arrange: sanitizeArrangement(raw.version >= 5 ? r.arrange : null),
      maskArrange: sanitizeArrangement(raw.version >= 5 ? r.maskArrange : null),
      maskUV: arrayNumbers(r.maskUV, base.maskUV, UV_PARAMS),
      maskParams: patternParameters(
        BY_ID.has(r.mask) ? r.mask : "Circle",
        migrateGearProfile(
          BY_ID.has(r.mask) ? r.mask : "Circle",
          legacy
            ? BY_ID.has(r.mask)
              ? migrateParameters(
                  r.mask,
                  [0.62, 0.08, 8, 0.02, 0.5, 0.25, 1, 0.2],
                )
              : null
            : r.maskParams,
          raw.version,
        ),
      ),
    };
  });
  if (
    Array.isArray(raw.order) &&
    raw.order.length === 3 &&
    new Set(raw.order).size === 3 &&
    raw.order.every((n) => [0, 1, 2].includes(n))
  )
    s.order = [...raw.order];
  s.palette = Math.round(finite(raw.palette, 0, 0, 12));
  if (
    Array.isArray(raw.stops) &&
    raw.stops.length >= 2 &&
    raw.stops.length <= 8 &&
    raw.stops.every((p) => /^#[0-9a-f]{6}$/i.test(p.color))
  )
    s.stops = raw.stops
      .map((p) => ({ position: finite(p.position, 0, 0, 1), color: p.color }))
      .sort((a, b) => a.position - b.position);
  s.post = arrayNumbers(raw.post, s.post, [
    ["", -0.6, 0.6],
    ["", 0.1, 3],
    ["", 0.1, 4],
    ["", -0.5, 0.95],
    ["", 0.05, 1.5],
    ["", 0, 0.9],
    ["", 0.1, 1.6],
  ]);
  const o = raw.output || {};
  if (raw.version >= 4) {
    s.output.seamless = o.seamless === true;
    s.output.seamMode = Math.round(finite(o.seamMode, 0, 0, 1));
    s.output.seamBlend = finite(o.seamBlend, 0.2, 0.05, 0.45);
  }
  for (const [key, min, max] of [
    ["mode", 0, 4],
    ["resolution", 64, 4096],
    ["aspect", 0.125, 8],
    ["width", 2, 8192],
    ["height", 2, 8192],
    ["normal", 0.1, 20],
  ])
    s.output[key] = finite(o[key], s.output[key], min, max);
  for (const key of ["mode", "width", "height", "resolution"])
    s.output[key] = Math.round(s.output[key]);
  for (const key of ["custom", "invert", "alpha"])
    s.output[key] = o[key] === true;
  s.output.precision = o.precision === 16 ? 16 : 8;
  s.output.exrZip = o.exrZip !== false;
  s.output.channels = s.output.channels.map((c, i) =>
    Math.round(finite(o.channels?.[i], c, 0, 8)),
  );
  const a = raw.animation || {};
  s.animation.duration = finite(a.duration, 3, 0.1, 30);
  s.animation.speed = finite(a.speed, 1, 0.25, 4);
  s.animation.time = finite(a.time, 0, 0, s.animation.duration);
  s.animation.pingpong = a.pingpong === true;
  s.animation.enabled = a.enabled !== false;
  s.animation.ease = ["linear", "smooth", "hold"].includes(a.ease)
    ? a.ease
    : "linear";
  const trackEntries = Object.entries(a.tracks || {}).slice(0, 465);
  for (const [key, frames] of trackEntries) {
    const match = /^layers\.([0-2])\.(params|maskParams|uv|arrange|maskArrange)\.([0-9]|[1-4][0-9]|5[0-7])$/.exec(
      key,
    );
    if (
      !match ||
      (match[2] === "uv" && Number(match[3]) > 6) ||
      !Array.isArray(frames)
    )
      continue;
    const layer = s.layers[Number(match[1])],
      slot = Number(match[3]);
    if (["maskParams", "maskArrange"].includes(match[2]) && !layer.mask) continue;
    if (raw.version < 5 && ["arrange", "maskArrange"].includes(match[2])) continue;
    if (["arrange", "maskArrange"].includes(match[2]) && slot===39) continue;
    const definition =
      match[2] === "uv"
        ? null
        : fieldSpec(layer, match[2], slot);
    if (match[2] !== "uv" && !definition) continue;
    if (raw.version < 5 && ["params", "maskParams"].includes(match[2]) &&
        (match[2] === "params" ? layer.type : layer.mask) === "Star" && [1, 5].includes(slot)) continue;
    if (
      raw.version < 3 &&
      match[2] !== "uv" &&
      (match[2] === "params" ? layer.type : layer.mask) === "Gear" &&
      [5, 6].includes(slot)
    )
      continue;
    if (
      legacy &&
      match[2] === "params" &&
      ((BY_ID.get(layer.type).vector && slot === 0) ||
        (layer.type === "DirectionalFlow" && slot === 5) ||
        [
          ["Circle", 1],
          ["RadialGradient", 4],
          ["Vignette", 4],
          ["Polygon", 5],
          ["Star", 4],
          ["RoundedRect", 5],
          ["RoundedRect", 4],
          ["Gear", 1],
          ["Gear", 4],
          ["Ellipse", 4],
          ["Capsule", 1],
          ["Checker", 3],
          ["Brick", 0],
          ["Brick", 5],
          ["LinearGradient", 1],
          ["LinearGradient", 5],
          ["ValueNoise", 0],
          ["FBM", 0],
          ["FBM", 4],
        ].some(([type, index]) => layer.type === type && index === slot))
    )
      continue;
    const spec =
      match[2] === "uv"
        ? UV_PARAMS[slot]
        : ["", definition.min, definition.max];
    const unique = new Map();
    for (const frame of frames.slice(0, 128)) {
      if (
        !Array.isArray(frame) ||
        !Number.isFinite(frame[0]) ||
        !Number.isFinite(frame[1])
      )
        continue;
      const t = finite(frame[0], 0, 0, s.animation.duration);
      unique.set(t, [t, finite(frame[1], 0, spec[1], spec[2])]);
    }
    if (unique.size)
      s.animation.tracks[key] = [...unique.values()].sort(
        (f, g) => f[0] - g[0],
      );
  }
  const f = raw.flipbook || {};
  s.flipbook = {
    columns: Math.round(finite(f.columns, 4, 1, 8)),
    rows: Math.round(finite(f.rows, 4, 1, 8)),
    cell: Math.round(finite(f.cell, 256, 32, 512)),
  };
  s.keep = raw.keep === true;
  return s;
}
export function decodeJSON(text) {
  if (text.length > 200000) throw new Error("配置文件过大（最大 200 KB）");
  return sanitize(JSON.parse(text));
}
export function frameState(state, time) {
  const s = clone(state);
  let t = Math.min(state.animation.duration, Math.max(0, time));
  if (state.animation.pingpong)
    t =
      t <= state.animation.duration / 2
        ? t * 2
        : (state.animation.duration - t) * 2;
  if (state.animation.enabled)
    for (const [path, frames] of Object.entries(state.animation.tracks)) {
      if (!frames.length) continue;
      let value = frames[0][1];
      if (t >= frames.at(-1)[0]) value = frames.at(-1)[1];
      else
        for (let i = 1; i < frames.length; i++) {
          const [bt, bv] = frames[i];
          const [at, av] = frames[i - 1];
          if (t <= bt) {
            let f = Math.max(
              0,
              Math.min(1, (t - at) / Math.max(bt - at, 0.000001)),
            );
            if (state.animation.ease === "smooth") f = f * f * (3 - 2 * f);
            if (state.animation.ease === "hold") f = 0;
            value = av + (bv - av) * f;
            break;
          }
        }
      const [, layer, field, index] = path.split(".");
      const target = s.layers[Number(layer)];
      const definition =
        field === "uv"
          ? null
          : fieldSpec(target, field, Number(index));
      target[field][Number(index)] =
        definition?.step === 1 ? Math.round(value) : value;
    }
  // Mode and count tracks may be stored in either order. Apply the active cap last.
  for (const layer of s.layers) for (const field of ["arrange", "maskArrange"]) {
    const values=layer[field];
    values[3]=Math.min(values[3],arrangementSpec(values[0],3).max);
  }
  return { state: s, time: t };
}
export function dimensions(s, res = s.output.resolution) {
  let w, h;
  if (s.output.custom) {
    w = s.output.width;
    h = s.output.height;
  } else {
    w = s.output.aspect >= 1 ? res : Math.round(res * s.output.aspect);
    h = s.output.aspect >= 1 ? Math.round(res / s.output.aspect) : res;
  }
  w = Math.max(2, w);
  h = Math.max(2, h);
  if (w * h > 16777216) throw new Error("导出上限为 1677 万像素，请降低宽高");
  return [w, h];
}
export function encodeHash(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return (
    "#fx=" +
    btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
  );
}
export function decodeHash(hash) {
  const value = hash.startsWith("#fx=") ? hash.slice(4) : "";
  if (!value || value.length > 260000) throw new Error("无效或过长的分享链接");
  const text = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return decodeJSON(
    new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(text, (c) => c.charCodeAt(0)),
    ),
  );
}
