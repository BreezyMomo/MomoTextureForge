import { CATALOG, CATEGORIES, BY_ID, PALETTES } from "./catalog.js";
import {
  defaults,
  newLayer,
  sanitize,
  decodeJSON,
  dimensions,
  encodeHash,
  decodeHash,
  frameState,
  UV_PARAMS,
  MODES,
  BLENDS,
  finite,
  fieldSpec,
} from "./state.js";
import { Renderer } from "./renderer.js";
import { encodePNG, encodeEXR, encodeZIP, download } from "./encoders.js";
import { seamlessDescription, seamlessKind } from "./seamless.js";
import { ARRANGEMENT_FAMILIES, arrangementFamily, arrangementSpec, arrangementDescription, sanitizeArrangement } from "./arrangement.js";
import { createCurveEditor } from "./curve-editor.js";
import { createWorkspace } from "./workspace-ui.js";
import { preferences, UI_KEY, DRAFT_KEY, encodeProject, decodeProject, projectName, recentTypes, arrangeShortcut } from "./workspace-model.js";
import {isStandalone, pageHref} from "./distribution.js";

const $ = (id) => document.getElementById(id),
  copy = (v) => structuredClone(v);
$("examples").onclick = () => window.open(pageHref("examples"), "_blank", "noopener");
if (isStandalone()) {
  $("share").textContent = "导出配置";
  $("share").title = "导出项目 JSON，接收者在同一个 HTML 中打开项目即可恢复";
}
const e = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const child of children)
    node.append(
      typeof child === "string" ? document.createTextNode(child) : child,
    );
  return node;
};
let state = defaults(),
  active = 0,
  playing = false,
  tiled = false,
  grab = false,
  dirty = true,
  busy = false,
  cancelled = false,
  diagnosticsRunning = false,
  lastClock = 0,
  lastEdit = "",
  lastEditAt = 0;
const past = [],
  future = [];
let presets = [];
let workspace, name = "未命名贴图", draftTimer, uiSettings=preferences(), initialExport={kind:"single",format:"png"};
let initializing=true,projectEdited=false,restoredDraft=false;
const typeMemory = new Map();
let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
}
try {
  uiSettings=preferences(JSON.parse(localStorage.getItem(UI_KEY)||"{}"));
} catch { toast("界面设置损坏，已使用默认设置"); }
try {
  if (location.hash.startsWith("#fx=")) state = decodeHash(location.hash);
  else {
    const draft=uiSettings.autosave&&localStorage.getItem(DRAFT_KEY);
    const saved = localStorage.getItem("momo-texture-forge:keep");
    if(draft){const project=decodeProject(draft);state=project.state;name=project.name;initialExport=project.export;restoredDraft=true;}
    else if (saved&&uiSettings.autosave) state = decodeJSON(saved);
  }
  const saved = JSON.parse(
    localStorage.getItem("momo-texture-forge:presets") || "[]",
  );
  if (Array.isArray(saved)) presets = validatePresets(saved);
} catch (error) {
  toast(`保存的配置未载入：${error.message}`);
}
let renderer, exportRenderer, thumbRenderer;
try {
  renderer = new Renderer($("preview"));
  exportRenderer = new Renderer(document.createElement("canvas"));
  thumbRenderer = new Renderer(document.createElement("canvas"));
} catch (error) {
  $("render-error").hidden = false;
  $("render-error").textContent = error.message;
  throw error;
}
$("precision-status").textContent = renderer.float
  ? "高精度导出可用"
  : "仅支持 PNG8 导出";
$("environment-info").textContent =
  `WebGL2 已连接 · 浮点渲染 ${renderer.float ? "可用" : "不可用"} · 最大纹理边长 ${renderer.maxSize} · 预览显示 8bit`;
const safe =
  (fn) =>
  (...args) => {
    try {
      const result = fn(...args);
      if (result?.catch) result.catch((error) => toast(error.message));
    } catch (error) {
      toast(error.message);
    }
  };
function pushHistory(key = "") {
  const now = performance.now();
  if (key && key === lastEdit && now - lastEditAt < 400) {
    lastEditAt = now;
    return;
  }
  past.push(copy(state));
  if (past.length > 60) past.shift();
  future.length = 0;
  lastEdit = key;
  lastEditAt = now;
}
function persist() {
  if(initializing)return;
  projectEdited=true;
  try {
    if (uiSettings.autosave&&state.keep)
      localStorage.setItem("momo-texture-forge:keep", JSON.stringify(state));
    else if(uiSettings.autosave) localStorage.removeItem("momo-texture-forge:keep");
  } catch {
    toast("浏览器存储已满，当前配置仍可导出为 JSON");
  }
  clearTimeout(draftTimer);
  if(uiSettings.autosave){if($("draft-status"))$("draft-status").textContent="正在保存草稿…";draftTimer=setTimeout(saveDraft,250);}
}
function saveDraft() {
  clearTimeout(draftTimer);
  if(!uiSettings.autosave){$("draft-status").textContent="自动草稿已暂停";return;}
  try{localStorage.setItem(DRAFT_KEY,encodeProject(state,name,undefined,{kind:workspace?.kind(),format:workspace?.format()}));$("draft-status").textContent=`草稿已保存 ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;}
  catch{$("draft-status").textContent="草稿保存失败，请保存项目文件";toast("浏览器存储已满，请保存项目 JSON");}
}
function saveUI(){try{localStorage.setItem(UI_KEY,JSON.stringify(uiSettings));}catch{toast("界面设置未保存：浏览器存储不可用");}}
function changed() {
  dirty = true;
  updateSeamlessSummary();
  for (const editor of document.querySelectorAll(".curve-editor")) editor.refreshCurve();
  for (const note of document.querySelectorAll("[data-arrangement-note]"))
    note.textContent = arrangementDescription(pathValue(note.dataset.arrangementNote), state.output.seamless) + "。原数值保留。";
  for (const select of document.querySelectorAll("[data-gear-profile]"))
    select.value = gearShapeName(
      pathValue(select.getAttribute("data-gear-profile")),
    );
  persist();
  updateTimeline();
  $("undo").disabled = !past.length;
  $("redo").disabled = !future.length;
  workspace?.refresh(state,active,playing);
}
function mutate(fn, key = "") {
  pushHistory(key);
  fn();
  changed();
}
function setPath(path, value) {
  const parts = path.split(".");
  let obj = state;
  for (const part of parts.slice(0, -1)) obj = obj[part];
  obj[parts.at(-1)] = value;
  const tracks = state.animation.tracks;
  if (tracks[path]) recordKey(path, value);
}
function pathValue(path, source = state) {
  return path.split(".").reduce((value, key) => value[key], source);
}
function recordKey(path, value) {
  const t =
    Math.round(frameState(state, state.animation.time).time * 100) / 100;
  const frames = state.animation.tracks[path] || [];
  const index = frames.findIndex((f) => Math.abs(f[0] - t) < 0.005);
  if (index >= 0) frames[index] = [t, value];
  else if (frames.length < 128) frames.push([t, value]);
  frames.sort((a, b) => a[0] - b[0]);
  state.animation.tracks[path] = frames;
}
function keyToggle(path) {
  workspace?.showAnimation(true);
  mutate(() => {
    const t =
      Math.round(frameState(state, state.animation.time).time * 100) / 100;
    const frames = state.animation.tracks[path] || [];
    const index = frames.findIndex((f) => Math.abs(f[0] - t) < 0.005);
    if (index >= 0) frames.splice(index, 1);
    else recordKey(path, pathValue(path));
    if (!frames.length && index >= 0) delete state.animation.tracks[path];
    else if (index >= 0) state.animation.tracks[path] = frames;
  });
  refreshKeyButtons();
}
function refreshKeyButtons() {
  for (const b of document.querySelectorAll("[data-key]")) {
    const count = state.animation.tracks[b.dataset.key]?.length || 0;
    b.textContent = count ? "◆" + count : "◇";
    b.classList.toggle("keyed", count > 0);
  }
}
function rangeRow(container, label, path, min, max, step, keyframe = false) {
  const value = pathValue(path),
    id = path.replaceAll(".", "-");
  const number = e("input", {
    id,
    type: "number",
    min,
    max,
    step,
    value,
    "aria-label": label,
  });
  const range = e("input", {
    type: "range",
    min,
    max,
    step,
    value,
    "aria-label": `${label}滑杆`,
  });
  const update = (raw) => {
    let v = finite(raw, value, min, max);
    v = Math.min(max, Math.max(min, Math.round(v / step) * step));
    v = Number(v.toFixed(4));
    mutate(() => setPath(path, v), path);
    number.value = range.value = v;
    refreshKeyButtons();
  };
  number.addEventListener(
    "change",
    safe(() => update(number.value)),
  );
  range.addEventListener(
    "input",
    safe(() => update(range.value)),
  );
  const head = e("div", { class: "param-head" }, [
    e("label", { htmlFor: id, text: label }),
    number,
  ]);
  if (keyframe)
    head.append(
      e("button", {
        class: "key-btn",
        "data-key": path,
        title: `${label}：加/删关键帧`,
        onclick: () => keyToggle(path),
        text: "◇",
      }),
    );
  container.append(e("div", { class: "param-row" }, [head, range]));
}
function selectField(container, label, path, options, onSelect = null) {
  const id = path.replaceAll(".", "-"),
    current = pathValue(path);
  const choices = options.some(([value]) => String(value) === String(current))
    ? options
    : [...options, [current, `${current}（配置值）`]];
  const select = e(
    "select",
    { id, "aria-label": label },
    choices.map(([value, text]) => e("option", { value, text })),
  );
  select.value = current;
  select.addEventListener(
    "change",
    safe(() => {
      const old = pathValue(path);
      const value =
        typeof old === "number" ? Number(select.value) : select.value;
      if (onSelect) onSelect(value);
      else mutate(() => setPath(path, value));
      if (path === "output.mode" || path === "output.custom") buildOutput();
    }),
  );
  container.append(e("label", { htmlFor: id }, [label, select]));
  return select;
}
function numberField(container, label, path, min, max, step = 1) {
  const id = path.replaceAll(".", "-");
  const number = e("input", {
    type: "number",
    id,
    min,
    max,
    step,
    value: pathValue(path),
    "aria-label": label,
    onchange: safe((event) => {
      mutate(() =>
        setPath(
          path,
          Math.min(
            max,
            Math.max(
              min,
              Math.round(
                finite(event.target.value, pathValue(path), min, max) / step,
              ) * step,
            ),
          ),
        ),
      );
      event.target.value = pathValue(path);
      if (path === "animation.duration") {
        $("time").max = state.animation.duration;
        state.animation.time = Math.min(
          state.animation.time,
          state.animation.duration,
        );
        state = sanitize(state);
        updateTimeline();
      }
    }),
  });
  container.append(e("label", { htmlFor: id }, [label, number]));
}
function checkField(container, label, path) {
  const id = path.replaceAll(".", "-");
  container.append(
    e("label", { class: "check" }, [
      e("input", {
        id,
        type: "checkbox",
        checked: pathValue(path),
        onchange: () => {
          mutate(() => setPath(path, !pathValue(path)));
          if (path === "output.custom") buildOutput();
          if (path === "output.seamless") {
            if (state.output.seamless) {
              tiled = true;
              $("tile").setAttribute("aria-pressed", true);
            }
            buildSeamless();
          }
          if (path.endsWith(".enabled")) buildLayer();
        },
      }),
      label,
    ]),
  );
}
function patternOptions(blank = false) {
  return [
    ...(blank ? [["", "无蒙版"]] : []),
    ...CATALOG.map((t) => [t.id, `${t.zh} · ${t.id}`]),
  ];
}
const thumbnailQueue = [];
let thumbnailPending = false;
const thumbs = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        thumbs.unobserve(entry.target);
        thumbnailQueue.push(entry.target);
        scheduleThumbnail();
      }
  },
  { root: $("type-list"), rootMargin: "80px" },
);
function scheduleThumbnail() {
  if (thumbnailPending || !thumbnailQueue.length || busy) return;
  thumbnailPending = true;
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 20)))(
    () => {
      thumbnailPending = false;
      const canvas = thumbnailQueue.shift();
      if (canvas?.isConnected) {
        try {
          const s = defaults();
          s.layers[0] = newLayer(canvas.dataset.type);
          thumbRenderer.draw(s, 40, 40);
          canvas.getContext("2d").drawImage(thumbRenderer.canvas, 0, 0, 40, 40);
        } catch {
          canvas.title = "预览不可用";
        }
      }
      scheduleThumbnail();
    },
    { timeout: 300 },
  );
}
function buildLibrary() {
  thumbs.disconnect();
  thumbnailQueue.length = 0;
  const query = $("search").value.trim().toLowerCase();
  let selected = CATALOG.filter((t) =>
    (t.id + " " + t.zh + " " + t.categoryName).toLowerCase().includes(query),
  );
  if(uiSettings.libraryFilter==="favorites")selected=selected.filter(t=>uiSettings.favorites.includes(t.id));
  if(uiSettings.libraryFilter==="recent")selected=selected.filter(t=>uiSettings.recent.includes(t.id)).sort((a,b)=>uiSettings.recent.indexOf(a.id)-uiSettings.recent.indexOf(b.id));
  $("type-count").textContent = `${selected.length} / ${CATALOG.length} 种图案`;
  $("catalog-summary").textContent = `${CATALOG.length} 种图案 · ${CATEGORIES.length} 个分类`;
  $("type-list").replaceChildren();
  for (const cat of uiSettings.libraryFilter==="recent"?[{name:"最近使用",category:null}]:CATEGORIES) {
    const list = cat.category===null?selected:selected.filter((t) => t.category === cat.category);
    if (!list.length) continue;
    const details = e("details", { class: "category", open: true }, [
      e("summary", {}, [
        cat.name,
        e("span", { class: "category-count", text: list.length }),
      ]),
    ]);
    const items = e("div", { class: "category-items" }, []);
    for (const type of list) {
      const canvas = e("canvas", {
        width: 40,
        height: 40,
        "data-type": type.id,
        "aria-hidden": "true",
      });
      const button = e(
        "button",
        {
          class:
            "type-item" +
            (type.id === state.layers[active].type ? " active" : ""),
          "data-type": type.id,
          onclick: () => chooseType(type.id),
        },
        [
          canvas,
          e("span", {}, [
            e("strong", { text: type.zh }),
            e("small", { text: type.id + (type.vector ? " · VEC" : "") }),
          ]),
        ],
      );
      const card=e("div",{class:"type-card"},[button,e("button",{class:"favorite-type",text:uiSettings.favorites.includes(type.id)?"★":"☆","aria-label":`${uiSettings.favorites.includes(type.id)?"取消收藏":"收藏"}${type.zh}`,"aria-pressed":String(uiSettings.favorites.includes(type.id)),onclick:()=>{uiSettings.favorites=uiSettings.favorites.includes(type.id)?uiSettings.favorites.filter(id=>id!==type.id):[...uiSettings.favorites,type.id];saveUI();buildLibrary();}},[])]);
      items.append(card);
      thumbs.observe(canvas);
    }
    details.append(items);
    $("type-list").append(details);
  }
  if(!selected.length)$("type-list").append(e("p",{class:"note",text:uiSettings.libraryFilter==="favorites"?"点击图案旁的 ☆ 添加收藏。":"没有匹配的图案。"}));
  workspace?.refresh(state,active,playing);
}
function updateSelection() {
  const type = state.layers[active].type;
  for (const button of document.querySelectorAll(".type-item"))
    button.classList.toggle("active", button.dataset.type === type);
  $("type-select").value = type;
  $("current-title").textContent="合成预览";
  workspace?.refresh(state,active,playing);
}
function chooseType(type) {
  const current=state.layers[active],prefix=`layers.${active}.params.`;
  typeMemory.set(`${active}:${current.type}`,{params:copy(current.params),tracks:Object.fromEntries(Object.entries(state.animation.tracks).filter(([key])=>key.startsWith(prefix)).map(([key,value])=>[key.slice(prefix.length),copy(value)]))});
  mutate(() => {
    const l = state.layers[active];
    l.type = type;
    const cached=typeMemory.get(`${active}:${type}`);
    l.params = cached?copy(cached.params):[...BY_ID.get(type).defaults];
    l.enabled = true;
    for (const key of Object.keys(state.animation.tracks))
      if (key.startsWith(`layers.${active}.params.`))
        delete state.animation.tracks[key];
    if(cached)for(const [slot,frames]of Object.entries(cached.tracks))state.animation.tracks[prefix+slot]=copy(frames);
  });
  uiSettings.recent=recentTypes(uiSettings.recent,type);saveUI();
  buildLayer();
  updateSelection();
  if(uiSettings.libraryFilter==="recent")buildLibrary();
}
function buildPalettes() {
  const grid = $("palette-grid");
  grid.replaceChildren();
  for (let i = 0; i <= 12; i++) {
    const stops = i === 12 ? state.stops : PALETTES[i].stops;
    const style = `background:linear-gradient(to right,${stops.map((p) => p.color + " " + p.position * 100 + "%").join(",")})`;
    grid.append(
      e("button", {
        class: "palette" + (state.palette === i ? " active" : ""),
        style,
        text: i === 12 ? "自定义" : PALETTES[i].name,
        onclick: () => {
          mutate(() => {
            state.palette = i;
            if (i < 12) state.stops = copy(PALETTES[i].stops);
          });
          buildPalettes();
          buildStops();
        },
      }),
    );
  }
}
function buildStops() {
  buildBackground();
  $("color-stops").replaceChildren();
  state.stops.forEach((stop, i) => {
    const color = e("input", {
      type: "color",
      value: stop.color,
      "aria-label": `色标 ${i + 1} 颜色`,
      oninput: () => {
        mutate(() => {
          state.stops[i].color = color.value;
          state.palette = 12;
        }, `color-${i}`);
        buildPalettes();
        buildBackground();
      },
    });
    const position = e("input", {
      type: "number",
      min: 0,
      max: 1,
      step: 0.01,
      value: stop.position,
      "aria-label": `色标 ${i + 1} 位置`,
      onchange: () => {
        mutate(() => {
          state.stops[i].position = finite(position.value, stop.position, 0, 1);
          state.stops.sort((a, b) => a.position - b.position);
          state.palette = 12;
        });
        buildStops();
        buildPalettes();
      },
    });
    $("color-stops").append(
      e("div", { class: "color-stop" }, [
        color,
        position,
        e("button", {
          text: "删除",
          disabled: state.stops.length <= 2,
          onclick: () => {
            mutate(() => {
              state.stops.splice(i, 1);
              state.palette = 12;
            });
            buildStops();
            buildPalettes();
          },
        }),
      ]),
    );
  });
  $("add-stop").disabled = state.stops.length >= 8;
}
function buildBackground() {
  const panel = $("background-panel");
  panel.replaceChildren();
  checkField(panel, "透明背景", "output.alpha");
  const color = e("input", {
    id: "background-color",
    type: "color",
    value: state.stops[0].color,
    "aria-label": "背景颜色（最低色标）",
    oninput: () => {
      mutate(() => {
        state.stops[0].color = color.value;
        state.palette = 12;
      }, "background-color");
      buildPalettes();
      const first = $("color-stops").querySelector('input[type="color"]');
      if (first) first.value = color.value;
    },
  });
  panel.append(
    e("label", { htmlFor: "background-color" }, ["背景颜色", color]),
  );
  panel.append(
    e("p", {
      class: "note",
      text: "背景颜色编辑渐变最低色标。透明背景以图案亮度作为 Alpha，适用于配色、灰度和翻转书；棋盘格仅用于预览，不会导出。法线保持不透明，RGBA 使用 A 通道设置。",
    }),
  );
}
function buildLayer() {
  const l = state.layers[active];
  $("layer-tabs").replaceChildren(
    ...state.layers.map((item, i) =>
      e("button", {
        class: "layer-tab" + (active === i ? " active" : ""),
        text: `图层 ${i + 1}${item.enabled ? " ●" : ""}`,
        onclick: () => {
          active = i;
          buildLayer();
          updateSelection();
        },
      }),
    ),
  );
  $("layer-config").replaceChildren();
  if (active > 0)
    checkField($("layer-config"), "启用此图层", `layers.${active}.enabled`);
  selectField(
    $("layer-config"),
    "当前图案",
    `layers.${active}.type`,
    patternOptions(),
    chooseType,
  );
  selectField(
    $("layer-config"),
    "混合模式",
    `layers.${active}.blend`,
    BLENDS.map((x, i) => [i, x]),
  );
  rangeRow(
    $("layer-config"),
    "不透明度",
    `layers.${active}.opacity`,
    0,
    1,
    0.01,
  );
  $("param-panel").replaceChildren();
  buildPatternControls($("param-panel"), l.type, `layers.${active}.params`);
  buildArrangement($("arrangement-panel"), `layers.${active}.arrange`);
  $("uv-panel").replaceChildren();
  UV_PARAMS.forEach(([label, min, max, step], i) =>
    rangeRow(
      $("uv-panel"),
      label,
      `layers.${active}.uv.${i}`,
      min,
      max,
      step,
      true,
    ),
  );
  $("polar").checked = l.polar;
  $("algorithm-note").textContent = [
    "ReactionDiffusion",
    "BlueNoise",
    "LensBlur",
    "RainGlass",
    "Fluid",
    "Caustics",
  ].includes(l.type)
    ? "该项为实时程序化近似，用于美术纹理制作，不是物理仿真。"
    : l.type === "Circle"
      ? "半径、内径和羽化分别控制圆的外轮廓、挖孔和边缘。"
      : l.vector
        ? "图案输出显示 RG 向量；法线/高度及图层混合使用标量采样。"
        : l.type === "Gear"
          ? "齿宽是一个齿距的比例；齿顶宽度 0 为三角尖齿，1 为方齿，中间值为梯形齿。"
          : l.type === "Star"
            ? "直边星用线段连接内外顶点；圆角星圆化星尖，圆角越大轮廓越饱满。旧版波瓣用于保留旧预设。"
          : l.type === "Brick"
            ? "每行使用相同错位。开启无缝平铺可自动对齐行数；关闭时需使用偶数行，或将行错位设为 0。"
            : `${BY_ID.get(l.type).zh}专属参数，点击 ◇ 可记录关键帧。`;
  buildOrder();
  buildMask();
  refreshKeyButtons();
  workspace?.refresh(state,active,playing);
}
function gearShapeName(top) {
  return top === 0
    ? "triangle"
    : top === 1
      ? "square"
      : top === 0.4
        ? "trapezoid"
        : "custom";
}
function buildPatternControls(container, type, path) {
  const editor = BY_ID.get(type).definition.editor.kind;
  if (editor === "star") {
    selectField(container, "星形轮廓", `${path}.5`, [[0,"直边星"],[1,"圆角星"],[2,"旧版波瓣"]])
      .addEventListener("change", () => path.includes("maskParams") ? buildMask() : buildLayer());
    appendKeyButton(container, `${path}.5`, "星形轮廓");
  }
  if (editor === "bezier") {
    container.append(createCurveEditor(() => pathValue(path), {
      canEdit: () => !busy,
      begin: () => pushHistory(),
      point: (i, x, y) => {
        setPath(`${path}.${i*2}`, x); setPath(`${path}.${i*2+1}`, y); changed();
        for (const slot of [i*2,i*2+1]) {
          const input = document.getElementById(`${path.replaceAll(".","-")}-${slot}`);
          if (input) { input.value = pathValue(`${path}.${slot}`); const slider = input.closest(".param-row")?.querySelector('input[type="range"]'); if (slider) slider.value = input.value; }
        }
      },
      end: refreshKeyButtons,
    }));
    container.append(e("p", { class:"note", text:"拖动四个圆点调整三次贝塞尔曲线；选中控制点也可按方向键。下方数值支持关键帧。" }));
    selectField(container, "端点形状", `${path}.12`, [[0,"圆头"],[1,"平头"]]);
    appendKeyButton(container, `${path}.12`, "端点形状");
  }
  if (editor === "gear") {
    const topPath = `${path}.6`,
      id = `${path.replaceAll(".", "-")}-profile`;
    const select = e(
      "select",
      {
        id,
        "aria-label": path.includes("maskParams") ? "蒙版齿形" : "齿形",
        "data-gear-profile": topPath,
        onchange: () => {
          const value = { square: 1, triangle: 0, trapezoid: 0.4 }[
            select.value
          ];
          if (value === undefined) return;
          mutate(() => setPath(topPath, value));
          buildLayer();
        },
      },
      [
        e("option", { value: "square", text: "方齿" }),
        e("option", { value: "triangle", text: "三角齿" }),
        e("option", { value: "trapezoid", text: "梯形齿" }),
        e("option", { value: "custom", text: "自定义齿顶", disabled: true }),
      ],
    );
    select.value = gearShapeName(pathValue(topPath));
    container.append(e("label", { htmlFor: id }, ["齿形", select]));
  }
  for (const { slot, label, min, max, step } of BY_ID.get(type).parameters) {
    if ((editor === "star" && slot === 5) || (editor === "bezier" && slot === 12)) continue;
    if (editor === "star" && slot === 1 && pathValue(`${path}.5`) !== 1) continue;
    rangeRow(container, label, `${path}.${slot}`, min, max, step, true);
  }
}
function appendKeyButton(container, path, label) {
  container.append(e("button", { class:"key-btn", "data-key":path, title:`${label}：加/删关键帧`, text:"◇", onclick:()=>keyToggle(path) }));
}
function buildArrangement(container, path) {
  container.replaceChildren();
  // Editing uses one scatter engine and one ring engine; no legacy-project migration.
  let mode = pathValue(`${path}.0`);
  if(mode===2||mode===3){
    const previous=pathValue(path), unified=sanitizeArrangement([...previous]);
    unified[0]=mode===2?8:7;
    const next=sanitizeArrangement(unified);
    if(mode===2){next[33]=1;next[19]=previous[7];}else next[32]=0;
    setPath(path,next);mode=next[0];
  }
  const changeMode=(value,patch={})=>{
    mutate(()=>{const next=sanitizeArrangement([...pathValue(path).slice(0)]);next[0]=Number(value);const full=sanitizeArrangement(next);Object.entries(patch).forEach(([slot,v])=>full[slot]=v);setPath(path,full);});
    buildArrangement(container,path);buildSeamless();
  };
  const choice=(label,current,options,change)=>{
    const select=e("select",{"aria-label":label},options.map(([value,text])=>e("option",{value,text})));
    select.value=String(current);select.addEventListener("change",safe(()=>change(Number(select.value))));
    container.append(e("label",{class:"arrangement-choice"},[label,select]));return select;
  };
  choice("排列方式",arrangementFamily(mode),ARRANGEMENT_FAMILIES,value=>changeMode(value,value===8?{33:1}:{})).id=`${path.replaceAll(".","-")}-0`;
  appendKeyButton(container, `${path}.0`, "排列方式");
  container.querySelector(".arrangement-choice").append(container.lastElementChild);
  if([1,4,11].includes(mode))choice("网格类型",mode,[[1,"矩形"],[4,"斜向"],[11,"六角"]],value=>changeMode(value));
  if([5,9].includes(mode))choice("螺旋类型",mode,[[5,"黄金角"],[9,"规则"]],value=>changeMode(value));
  if([7,12].includes(mode))choice("密度分布",mode,[[7,"整个区域"],[12,"使用密度图案"]],value=>changeMode(value));
  if (!mode) return;
  container.append(e("div",{class:"layout-shortcuts"},[
    e("button",{text:"居中",onclick:()=>layoutShortcut(path,"center")}),
    e("button",{text:(mode===1||mode===4)?"铺满网格":mode===2?"环形适配":[3,7,12].includes(mode)?"铺满区域":"分布适配",onclick:()=>layoutShortcut(path,"fill")})
  ]));
  const advanced=e("details",{class:"arrangement-advanced"},[e("summary",{text:"高级：随机扰动与位置"})]);
  const slots = [ ...([1,4,11].includes(mode)?[1,2]:mode===6&&pathValue(`${path}.30`)?[]:[3]), 4,5,6,
    ...(mode===2?[7,15]:[]), ...(mode===5?[16,17,18,19]:[]),
    ...(mode===6?[18,19,28,29,...(pathValue(`${path}.30`)?[31]:[]),...Array.from({length:8},(_,i)=>20+i)]:[]),
    ...(mode===7?[32,18,19]:[]), ...(mode===8?[33,15,...(pathValue(`${path}.33`)>1?[34,36,18]:[]),19]:[]),
    ...(mode===9?[35,36,18,19]:[]), ...(mode===10?[34,37]:[]),
    ...(mode===11?[38]:[]), ...(mode===12?[32,40,41,18,19]:[]),
    ...([7,12].includes(mode)?[]:[8]),9,10,11,...(mode===1?[12]:[]),13,14 ];
  if(mode===8){selectField(container,"数量分布",`${path}.58`,[[1,"按间距均匀分布"],[0,"每圈等数量"]]).addEventListener("change",()=>buildArrangement(container,path));appendKeyButton(container,`${path}.58`,"数量分布");}
  if(mode===6){
    selectField(container,"路径采样方式",`${path}.30`,[[0,"按数量等距"],[1,"按间距"]]).addEventListener("change",()=>buildArrangement(container,path));
    appendKeyButton(container,`${path}.30`,"路径采样方式");
    container.append(createCurveEditor(()=>pathValue(path).slice(20,28),{
      canEdit:()=>!busy,begin:()=>pushHistory(),point:(i,x,y)=>{setPath(`${path}.${20+i*2}`,x);setPath(`${path}.${21+i*2}`,y);changed();},end:()=>{buildArrangement(container,path);refreshKeyButtons();}
    }));
  }
  if(mode===12){
    selectField(container,"密度图案",`${path}.39`,CATALOG.map((p,i)=>[i,p.zh+" · "+p.id]),value=>{
      mutate(()=>{setPath(`${path}.39`,Number(value));CATALOG[value].defaults.forEach((v,i)=>{setPath(`${path}.${42+i}`,v);delete state.animation.tracks[`${path}.${42+i}`];});});
      buildArrangement(container,path);
    });
    const densityControls=e("details",{},[e("summary",{text:"密度图案参数"})]);
    for(const p of CATALOG[pathValue(`${path}.39`)].parameters)rangeRow(densityControls,p.label,`${path}.${42+p.slot}`,p.min,p.max,p.step,true);
    container.append(densityControls);
  }
  for (const slot of slots) {
    const spec = arrangementSpec(mode,slot,pathValue(path));
    if(slot===37||slot===38){
      selectField(container,spec.label,`${path}.${slot}`,slot===37?[[0,"仅放射旋转"],[1,"旋转 + 镜像成对"]]:[[0,"横向错列"],[1,"纵向错列"]]);appendKeyButton(container,`${path}.${slot}`,spec.label);continue;
    }
    if (slot === 7 || slot === 19) {
      selectField(container, spec.label, `${path}.${slot}`, slot===19?[[0,"保持方向"],[1,[6,9].includes(mode)?"沿路径切线":"朝向圆心外"],[2,[6,9].includes(mode)?"垂直路径":"沿圆周切线"]]:[[0,"保持方向"],[1,"朝向圆心外"]]);
      appendKeyButton(container, `${path}.${slot}`, spec.label);
      continue;
    }
    rangeRow([8,9,10,11,12,13,14].includes(slot)?advanced:container,spec.label,`${path}.${slot}`,spec.min,spec.max,spec.step,true);
  }
  container.append(advanced);
  if(mode===8)container.querySelector(`#${path.replaceAll(".","-")}-33`)?.closest(".param-row").querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>buildArrangement(container,path)));
  if([7,12].includes(mode))container.append(e("p",{class:"note",text:"最小中心距离为0时允许随机聚集，大于0时限制中心间距。数量是目标上限；最小距离、可用区域或密度不足时实际数量会减少。最小距离约束实例中心，不保证形状不重叠。"}));
  if(mode===8||mode===10)container.append(e("p",{class:"note",text:mode===8?"按间距模式以最外圈数量为基准，内圈按半径比例减少；等数量模式各圈相同。零半径仅一个中心实例，总数最多256。":"实例数量表示对称份数；镜像成对会生成双倍实例，总数超过256时减少有效份数，保持完整对称。位置/旋转随机会打破对称。"}));
  container.append(e("p", { class:"note", text:"先生成源图，再排列。散布、环形、螺旋、路径与对称最多 256 个实例，网格最多 64 个；矢量图案按标量处理。开启无缝会限制有效尺寸并跨边缘重复，原数值保留。UV 用于每个实例的源图。" }));
  container.append(e("p", { class:"note", "data-arrangement-note":path, text:arrangementDescription(pathValue(path),state.output.seamless)+"。原数值保留。" }));
}
function layoutShortcut(path,action){const value=arrangeShortcut(pathValue(path),action);mutate(()=>value.forEach((v,i)=>setPath(`${path}.${i}`,v)));buildLayer();toast(action==="center"?"布局已居中":[3,7,12].includes(value[0])?"布局半径已设为0.5、中心偏移已归零":"布局已适配画布；图案自身空白会保留");}
function buildOrder() {
  $("order-panel").replaceChildren();
  state.order.forEach((index, position) => {
    $("order-panel").append(
      e(
        "div",
        {
          class: "order-row",
          draggable: true,
          ondragstart: (event) =>
            event.dataTransfer.setData("text/plain", String(index)),
          ondragover: (event) => event.preventDefault(),
          ondrop: (event) => {
            event.preventDefault();
            const source = Number(event.dataTransfer.getData("text/plain"));
            if (![0, 1, 2].includes(source)) return;
            mutate(() => {
              const from = state.order.indexOf(source);
              state.order.splice(from, 1);
              state.order.splice(position, 0, source);
            });
            buildOrder();
          },
        },
        [
          e("span", {
            text: `${position === 0 ? "底层" : "↑"} · 图层 ${index + 1}${state.layers[index].enabled ? "" : "（关闭）"}`,
          }),
          e("button", {
            text: "↑",
            title: "向底层移动",
            disabled: position === 0,
            onclick: () => moveLayer(position, -1),
          }),
          e("button", {
            text: "↓",
            title: "向上层移动",
            disabled: position === 2,
            onclick: () => moveLayer(position, 1),
          }),
        ],
      ),
    );
  });
}
function moveLayer(position, delta) {
  mutate(() => {
    [state.order[position], state.order[position + delta]] = [
      state.order[position + delta],
      state.order[position],
    ];
  });
  buildOrder();
}
function buildMask() {
  const panel = $("mask-panel");
  panel.replaceChildren();
  selectField(
    panel,
    `图层 ${active + 1} 蒙版`,
    `layers.${active}.mask`,
    patternOptions(true),
    (value) => {
      mutate(() => {
        const layer = state.layers[active];
        layer.mask = value;
        layer.maskParams = [...BY_ID.get(value || "Circle").defaults];
        for (const path of Object.keys(state.animation.tracks))
          if (path.startsWith(`layers.${active}.maskParams.`))
            delete state.animation.tracks[path];
      });
      buildMask();
      refreshKeyButtons();
    },
  );
  checkField(panel, "反相蒙版", `layers.${active}.maskInvert`);
  if (state.layers[active].mask) {
    const definition = BY_ID.get(state.layers[active].mask);
    panel.append(e("h3", { text: definition.zh + " · 蒙版参数" }));
    buildPatternControls(panel, definition.id, `layers.${active}.maskParams`);
    const arrange = e("div");
    buildArrangement(arrange, `layers.${active}.maskArrange`);
    panel.append(e("details", {}, [e("summary", { text:"独立蒙版排列" }), arrange]));
  }
  const body = e("div");
  UV_PARAMS.forEach(([label, min, max, step], i) =>
    rangeRow(body, label, `layers.${active}.maskUV.${i}`, min, max, step),
  );
  panel.append(e("details", {}, [e("summary", { text: "独立蒙版 UV" }), body]));
  buildSeamless();
}
const postSpecs = [
  ["亮度", -0.6, 0.6, 0.01],
  ["对比度", 0.1, 3, 0.01],
  ["伽马", 0.1, 4, 0.01],
  ["输入低", -0.5, 0.95, 0.01],
  ["输入高", 0.05, 1.5, 0.01],
  ["输出低", 0, 0.9, 0.01],
  ["输出高", 0.1, 1.6, 0.01],
];
function buildPost() {
  $("post-panel").replaceChildren();
  postSpecs.forEach(([label, min, max, step], i) =>
    rangeRow($("post-panel"), label, `post.${i}`, min, max, step),
  );
}
function buildAnimation() {
  const panel = $("animation-panel");
  panel.replaceChildren();
  numberField(panel, "循环时长（秒）", "animation.duration", 0.1, 30, 0.1);
  checkField(panel, "往复循环（完整时长正放+倒放）", "animation.pingpong");
  numberField(panel, "图集列数", "flipbook.columns", 1, 8);
  numberField(panel, "图集行数", "flipbook.rows", 1, 8);
  selectField(
    panel,
    "每帧尺寸",
    "flipbook.cell",
    [64, 128, 256, 512].map((n) => [n, n + " px"]),
  );
}
function buildOutput() {
  const panel = $("output-panel");
  panel.replaceChildren();
  selectField(
    panel,
    "输出模式",
    "output.mode",
    [...MODES.slice(0,4).map((x,i)=>[i,x]),...(state.output.mode===4?[[4,"图案配色（旧图集配置）"]]:[])],
  ).addEventListener("change", () => {
    $("flipbook-preview").hidden = workspace?.kind()!=="atlas" && state.output.mode !== 4;
  });
  selectField(
    panel,
    "长边分辨率",
    "output.resolution",
    [64, 128, 256, 512, 1024, 2048, 4096].map((x) => [x, x]),
  );
  selectField(panel, "宽高比例", "output.aspect", [
    [1, "1:1"],
    [2, "2:1"],
    [0.5, "1:2"],
    [3, "3:1"],
    [1 / 3, "1:3"],
    [4, "4:1"],
    [0.25, "1:4"],
    [16 / 9, "16:9"],
    [9 / 16, "9:16"],
  ]);
  checkField(panel, "自定义宽 × 高", "output.custom");
  if (state.output.custom) {
    numberField(panel, "宽（px）", "output.width", 2, 8192);
    numberField(panel, "高（px）", "output.height", 2, 8192);
  }
  selectField(panel, "PNG 位深", "output.precision", [
    [8, "8bit"],
    [16, "16bit（浮点直出）"],
  ]);
  checkField(panel, "EXR ZIP 无损压缩", "output.exrZip");
  checkField(panel, "反相标量", "output.invert");
  if (state.output.mode === 2 || state.output.mode === 3)
    rangeRow(panel, "法线强度", "output.normal", 0.1, 20, 0.1);
  if (state.output.mode === 3) {
    const choices = [
      "高度",
      "反相高度",
      "法线 X",
      "法线 Y",
      "法线 Z",
      "0",
      "1",
      "0.5",
      "法线斜率",
    ];
    for (let i = 0; i < 4; i++)
      selectField(
        panel,
        "RGBA"[i] + " 通道",
        `output.channels.${i}`,
        choices.map((x, j) => [j, x]),
      );
  }
  if (!renderer.float) {
    $("output-precision").disabled = true;
    $("export-exr").disabled = true;
    state.output.precision = 8;
  }
}
function buildSeamless() {
  const panel = $("seamless-panel");
  panel.replaceChildren();
  checkField(panel, "无缝平铺（预览与导出）", "output.seamless");
  if (state.output.seamless) {
    selectField(panel, "处理方式", "output.seamMode", [
      [0, "自动：周期 / 形状重复"],
      [1, "通用：边缘融合"],
    ]).addEventListener("change", buildSeamless);
    if (
      state.layers.some(
        (l) =>
          l.enabled &&
          ((!l.arrange[0] && seamlessKind(l.type, state.output.seamMode) === 0) ||
            (l.mask && !l.maskArrange[0] && seamlessKind(l.mask, state.output.seamMode) === 0)),
      )
    )
      rangeRow(panel, "融合宽度", "output.seamBlend", 0.05, 0.45, 0.01);
  }
  updateSeamlessSummary();
}
function updateSeamlessSummary() {
  const target = $("seamless-summary");
  if (!target) return;
  if (!state.output.seamless) {
    target.textContent = "开启后自动处理接缝；平铺检查用于显示 2×2 重复。";
    return;
  }
  const evaluated = frameState(state, state.animation.time).state;
  target.textContent =
    evaluated.layers
      .flatMap((l, i) => {
        if (!l.enabled) return [];
        const note = [
          `图层 ${i + 1}：${seamlessDescription(l, state.output.seamMode)}`,
        ];
        if (l.mask)
          note.push(
            `蒙版：${seamlessDescription({ ...l, type: l.mask, params: l.maskParams, uv: l.maskUV, arrange: l.maskArrange }, state.output.seamMode)}`,
          );
        return note;
      })
      .join("；") +
    "。原参数保留。周期图案旋转按 90° 对齐；几何重复限制过大尺寸；这些方式不使用漩涡与极坐标。复杂图案自动使用边缘融合。";
}
function updateTimeline() {
  $("time").max = state.animation.duration;
  $("time").value = state.animation.time;
  $("time-value").textContent = state.animation.time.toFixed(2) + " s";
  $("key-enabled").checked = state.animation.enabled;
  $("key-ease").value = state.animation.ease;
  $("play-speed").value = state.animation.speed;
  $("key-track").replaceChildren();
  const keys = new Set();
  for (const frames of Object.values(state.animation.tracks))
    for (const [time] of frames) keys.add(time);
  for (const time of [...keys].sort((a, b) => a - b))
    $("key-track").append(
      e("button", {
        class: "key-dot",
        style: `left:${(time / state.animation.duration) * 100}%`,
        text: "◆",
        title: time.toFixed(2) + " s",
        onclick: () => {
          state.animation.time = state.animation.pingpong ? time / 2 : time;
          playing = false;
          updatePlay();
          changed();
        },
      }),
    );
  const paths = Object.keys(state.animation.tracks);
  $("key-summary").textContent = paths.length
    ? paths
        .map((path) => {
          const [, index, field, slot] = path.split("."),
            layer = state.layers[Number(index)];
          const label =
            field === "uv"
              ? UV_PARAMS[Number(slot)][0]
              : fieldSpec(layer, field, Number(slot))?.label;
          return `图层 ${Number(index) + 1}${["maskParams", "maskArrange"].includes(field) ? " 蒙版" : ""} ${label || slot} (${state.animation.tracks[path].length})`;
        })
        .join(" · ")
    : "点参数右侧 ◇，在当前时间记录关键帧";
}
function updatePlay() {
  if(playing)workspace?.showAnimation(true);
  $("play").textContent = playing ? "暂停" : "播放";
  $("play").setAttribute("aria-label", playing ? "暂停动画" : "播放动画");
}
function rebuild() {
  buildPalettes();
  buildStops();
  buildLayer();
  buildPost();
  buildAnimation();
  buildOutput();
  buildSeamless();
  updateSelection();
  updateTimeline();
  buildPresets();
  $("keep").checked = state.keep;
  $("flipbook-preview").hidden = state.output.mode !== 4;
  changed();
}
function replaceState(next) {
  typeMemory.clear();
  workspace?.showAnimation(false);
  pushHistory();
  state = sanitize(next);
  playing = false;
  active = 0;
  updatePlay();
  rebuild();
}
function validatePresets(list) {
  if (list.length > 40) throw new Error("预设最多 40 个");
  return list.map((p) => {
    if (
      !p ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.length > 80
    )
      throw new Error("预设名称无效");
    return {
      name: p.name.trim(),
      category: ["未分类", "常用", "材质", "图案", "能量", "其他"].includes(
        p.category,
      )
        ? p.category
        : "未分类",
      state: sanitize(p.state),
    };
  });
}
function savePresets(next) {
  const checked = validatePresets(next);
  localStorage.setItem("momo-texture-forge:presets", JSON.stringify(checked));
  presets = checked;
  buildPresets();
}
function buildPresets() {
  $("preset-count").textContent = presets.length + " / 40";
  $("preset-list").replaceChildren();
  presets.forEach((p, i) => {
    const cat = e(
      "select",
      { "aria-label": `${p.name} 分类` },
      ["未分类", "常用", "材质", "图案", "能量", "其他"].map((x) =>
        e("option", { text: x }),
      ),
    );
    cat.value = p.category;
    cat.addEventListener(
      "change",
      safe(() => {
        const next = copy(presets);
        next[i].category = cat.value;
        savePresets(next);
      }),
    );
    $("preset-list").append(
      e("div", { class: "preset-row" }, [
        e("button", {
          class: "preset-load",
          text: p.name,
          title: "载入 " + p.name,
          onclick: () => replaceState(p.state),
        }),
        cat,
        e("button", {
          text: "改名",
          onclick: safe(() => {
            const name = prompt("新预设名称", p.name);
            if (name === null) return;
            const next = copy(presets);
            next[i].name = name;
            savePresets(next);
          }),
        }),
        e("button", {
          text: "删除",
          onclick: safe(() => {
            savePresets(presets.filter((_, j) => i !== j));
          }),
        }),
      ]),
    );
  });
}
function previewDraw() {
  const size = Number($("preview-size").value),
    aspect = state.output.aspect;
  let w = aspect >= 1 ? size : Math.round(size * aspect),
    h = aspect >= 1 ? Math.round(size / aspect) : size;
  if (state.output.custom) {
    const f = size / Math.max(state.output.width, state.output.height);
    w = Math.round(state.output.width * f);
    h = Math.round(state.output.height * f);
  }
  renderer.draw(state, Math.max(2, w), Math.max(2, h), { tile: tiled });
  workspace?.applyView();
  if (state.output.seamless) updateSeamlessSummary();
  const effective = frameState(state, state.animation.time).state;
  for (const note of document.querySelectorAll("[data-arrangement-note]")) {
    const values=pathValue(note.dataset.arrangementNote,effective),parts=note.dataset.arrangementNote.split(".");
    const count=renderer.lastArrangementCounts?.[Number(parts[1])+(parts[2]==="maskArrange"?3:0)];
    note.textContent = arrangementDescription(values, state.output.seamless) + (values[0]>=6&&count!==undefined?` · 实际生成 ${count} 个`:"") + "。原数值保留。";
  }
  $("stage-badge").textContent =
    `${w} × ${h}${tiled ? " · 2×2" : ""}${state.output.seamless ? " · 无缝" : ""}`;
  $("render-status").textContent =
    playing ? "动画预览" : "预览已更新";
  $("render-error").hidden = true;
}
function tick(now) {
  const dt = lastClock ? Math.min((now - lastClock) / 1000, 0.1) : 0;
  lastClock = now;
  if (!busy) {
    if (playing) {
      state.animation.time =
        (state.animation.time + dt * state.animation.speed) %
        state.animation.duration;
      dirty = true;
      updateTimeline();
    }
    if (dirty) {
      dirty = false;
      try {
        previewDraw();
      } catch (error) {
        playing = false;
        updatePlay();
        $("render-error").hidden = false;
        $("render-error").textContent = error.message;
        console.error(error);
      }
    }
  }
  requestAnimationFrame(tick);
}
function readPixels(w, h, time = state.animation.time, high = false) {
  return exportRenderer.draw(state, w, h, { time, float: high, read: true });
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
function checkCancel() {
  if (cancelled) throw new Error("已取消，未生成下载文件");
}
function lockEditor(locked) {
  document.querySelector("main").inert = locked;
  document.querySelector("header").inert = locked;
  document.querySelector(".project-toolbar").inert = locked;
}
async function runExport(label, job) {
  if (busy) {
    toast("正在执行另一项任务");
    return;
  }
  busy = true;
  lockEditor(true);
  cancelled = false;
  playing = false;
  updatePlay();
  $("export-message").textContent = label;
  $("export-progress").value = 0;
  $("export-dialog").showModal();
  const snapshot = copy(state);
  try {
    await pause();
    await job((progress, message) => {
      $("export-progress").value = progress;
      $("export-message").textContent = message;
    });
    toast("导出完成");
  } catch (error) {
    toast(error.message);
    console.error(error);
  } finally {
    state = snapshot;
    busy = false;
    lockEditor(false);
    $("export-dialog").close();
    dirty = true;
    scheduleThumbnail();
  }
}
async function atlas(
  progress,
  { preview = false, frames = false, format = "png" } = {},
) {
  const { columns, rows, cell } = state.flipbook,
    total = columns * rows,
    w = columns * cell,
    h = rows * cell;
  const high = format === "exr" || state.output.precision === 16;
  if (w > 4096 || h > 4096 || w * h > 16777216)
    throw new Error("图集过大，请减小行列数或每帧尺寸");
  const pixels = frames ? null : new Float32Array(w * h * 4),
    entries = [];
  for (let index = 0; index < total; index++) {
    checkCancel();
    const time = (index / total) * state.animation.duration;
    const frame = readPixels(cell, cell, time, high);
    if (frames)
      entries.push({
        name: `${state.layers[0].type}_${String(index).padStart(3, "0")}.png`,
        data: await encodePNG(frame, cell, cell, state.output.precision),
      });
    else {
      const ox = (index % columns) * cell,
        oy = Math.floor(index / columns) * cell;
      for (let y = 0; y < cell; y++)
        pixels.set(
          frame.subarray(y * cell * 4, (y + 1) * cell * 4),
          ((oy + y) * w + ox) * 4,
        );
    }
    progress((index + 1) / total, `序列帧 ${index + 1} / ${total}`);
    await pause();
  }
  checkCancel();
  if (preview) {
    const canvas = $("atlas-preview");
    canvas.width = w;
    canvas.height = h;
    const data = new Uint8ClampedArray(pixels.length);
    for (let i = 0; i < data.length; i++)
      data[i] = Math.round(Math.min(1, Math.max(0, pixels[i])) * 255);
    canvas.getContext("2d").putImageData(new ImageData(data, w, h), 0, 0);
    return;
  }
  if (frames) {
    entries.push({
      name: "manifest.json",
      data: new TextEncoder().encode(
        JSON.stringify(
          {
            schema: "momo-texture-frames/v1",
            columns,
            rows,
            cell,
            duration: state.animation.duration,
            frameCount: total,
            order: "row-major-top-left",
            state,
          },
          null,
          2,
        ),
      ),
    });
    download(encodeZIP(entries), `${state.layers[0].type}_frames.zip`);
  } else {
    const bytes =
      format === "exr"
        ? await encodeEXR(pixels, w, h, state.output.exrZip)
        : await encodePNG(pixels, w, h, state.output.precision);
    checkCancel();
    download(bytes, `${state.layers[0].type}_${columns}x${rows}.${format}`);
  }
}
async function exportImage(format) {
  return runExport("生成 " + format.toUpperCase(), async (progress) => {
    if (state.output.mode === 4) {
      await atlas(progress, { format });
      return;
    }
    const [w, h] = dimensions(state);
    progress(0.15, `渲染 ${w} × ${h}`);
    await pause();
    checkCancel();
    const pixels = readPixels(
      w,
      h,
      state.animation.time,
      format === "exr" || state.output.precision === 16,
    );
    progress(0.65, "编码文件");
    await pause();
    const bytes =
      format === "exr"
        ? await encodeEXR(pixels, w, h, state.output.exrZip)
        : await encodePNG(pixels, w, h, state.output.precision);
    checkCancel();
    download(bytes, `${state.layers[0].type}_${w}x${h}.${format}`);
    progress(1, "完成");
  });
}

// Static event routes; no remote services or code evaluation.
$("type-select").replaceChildren(
  ...CATALOG.map((t) =>
    e("option", { value: t.id, text: t.id + " · " + t.zh }),
  ),
);
$("type-select").addEventListener("change", () =>
  chooseType($("type-select").value),
);
$("search").addEventListener("input", buildLibrary);
$("collapse").onclick = () => {
  const nodes = [...document.querySelectorAll("details.category")],
    open = !nodes.every((n) => n.open);
  for (const n of nodes) n.open = open;
  $("collapse").textContent = open ? "收起分类" : "展开分类";
};
$("random").onclick = () => {
  const t = CATALOG[Math.floor(Math.random() * CATALOG.length)];
  chooseType(t.id);
  randomParams();
};
function randomParams() {
  mutate(() => {
    const p = state.layers[active].params;
    for (const definition of BY_ID.get(state.layers[active].type).parameters) {
      const { slot, min, max, step } = definition;
      p[slot] = Number(
        Math.min(
          max,
          Math.max(
            min,
            Math.round((min + Math.random() * (max - min)) / step) * step,
          ),
        ).toFixed(4),
      );
    }
    if (["Circle", "Gear"].includes(state.layers[active].type))
      p[1] = Math.min(p[1], p[0] * 0.8);
    for (let i = 0; i < p.length; i++)
      if (state.animation.tracks[`layers.${active}.params.${i}`])
        recordKey(`layers.${active}.params.${i}`, p[i]);
  });
  buildLayer();
}
$("random-params").onclick = randomParams;
$("add-stop").onclick = () => {
  mutate(() => {
    state.stops.push({ position: 0.5, color: "#e9a35c" });
    state.stops.sort((a, b) => a.position - b.position);
    state.palette = 12;
  });
  buildStops();
  buildPalettes();
};
$("polar").onchange = () =>
  mutate(() => (state.layers[active].polar = $("polar").checked));
$("reset-uv").onclick = () => {
  mutate(() => {
    state.layers[active].uv = [1, 0, 0, 0, 0, 0, 0];
    for (const key of Object.keys(state.animation.tracks))
      if (key.startsWith(`layers.${active}.uv.`))
        delete state.animation.tracks[key];
  });
  buildLayer();
};
$("reset-post").onclick = () => {
  mutate(() => (state.post = [0, 1, 1, 0, 1, 0, 1]));
  buildPost();
};
$("play").onclick = () => {
  playing = !playing;
  lastClock = 0;
  updatePlay();
};
$("time").oninput = () => {
  playing = false;
  state.animation.time = Number($("time").value);
  updatePlay();
  changed();
};
$("play-speed").onchange = () =>
  mutate(() => (state.animation.speed = Number($("play-speed").value)));
$("key-ease").onchange = () =>
  mutate(() => (state.animation.ease = $("key-ease").value));
$("key-enabled").onchange = () =>
  mutate(() => (state.animation.enabled = $("key-enabled").checked));
$("clear-keys").onclick = () => {
  mutate(() => (state.animation.tracks = {}));
  refreshKeyButtons();
};
$("preview-size").onchange = () => (dirty = true);
$("tile").onclick = () => {
  tiled = !tiled;
  $("tile").setAttribute("aria-pressed", tiled);
  dirty = true;
};
$("grab").onclick = () => {
  grab = !grab;
  if(grab)workspace?.disablePan();
  $("grab").setAttribute("aria-pressed", grab);
  $("preview").style.cursor = grab ? "grab" : "default";
};
let drag = null;
$("preview").addEventListener("pointerdown", (event) => {
  if (!grab || busy) return;
  pushHistory();
  drag = {
    x: event.clientX,
    y: event.clientY,
    uv: [...state.layers[active].uv],
    rotation: event.shiftKey,
  };
  $("preview").setPointerCapture(event.pointerId);
});
$("preview").addEventListener("pointermove", (event) => {
  if (!drag) return;
  const box = $("preview").getBoundingClientRect(),
    u = state.layers[active].uv;
  if (drag.rotation)
    u[1] = finite(drag.uv[1] + (event.clientX - drag.x), 0, -360, 360);
  else {
    u[2] = finite(
      drag.uv[2] - (event.clientX - drag.x) / box.width / u[0],
      0,
      -2,
      2,
    );
    u[3] = finite(
      drag.uv[3] + (event.clientY - drag.y) / box.height / u[0],
      0,
      -2,
      2,
    );
  }
  for (const i of drag.rotation ? [1] : [2, 3])
    if (state.animation.tracks[`layers.${active}.uv.${i}`])
      recordKey(`layers.${active}.uv.${i}`, u[i]);
  changed();
});
$("preview").addEventListener("pointerup", () => {
  if (drag) {
    drag = null;
    buildLayer();
  }
});
$("preview").addEventListener("pointercancel", () => (drag = null));
$("preview").addEventListener(
  "wheel",
  (event) => {
    if (!grab || busy) return;
    event.preventDefault();
    mutate(() => {
      state.layers[active].uv[0] = finite(
        state.layers[active].uv[0] * Math.exp(-event.deltaY * 0.001),
        1,
        0.1,
        8,
      );
      if (state.animation.tracks[`layers.${active}.uv.0`])
        recordKey(`layers.${active}.uv.0`, state.layers[active].uv[0]);
    }, "wheel");
    buildLayer();
  },
  { passive: false },
);
$("preview").ondblclick = () => {
  if (grab) $("reset-uv").click();
};
$("undo").onclick = () => {
  typeMemory.clear();
  if (!past.length || busy) return;
  future.push(copy(state));
  state = past.pop();
  lastEdit = "";
  playing = false;
  updatePlay();
  rebuild();
};
$("redo").onclick = () => {
  typeMemory.clear();
  if (!future.length || busy) return;
  past.push(copy(state));
  state = future.pop();
  lastEdit = "";
  playing = false;
  updatePlay();
  rebuild();
};
$("reset").onclick = () => {workspace?.setSelection({kind:"single",format:"png"});replaceState(defaults());};
$("keep").onchange = () => mutate(() => (state.keep = $("keep").checked));
$("preset-save").onclick = safe(() => {
  const name = $("preset-name").value.trim();
  if (!name) throw new Error("先填写预设名称");
  const next = copy(presets),
    index = next.findIndex((p) => p.name === name),
    preset = { name, category: $("preset-category").value, state: copy(state) };
  if (index >= 0) next[index] = preset;
  else next.push(preset);
  savePresets(next);
  toast("预设已保存");
});
$("preset-export").onclick = () =>
  download(
    new TextEncoder().encode(
      JSON.stringify({ schema: "momo-texture-presets/v1", presets }, null, 2),
    ),
    "momo-texture-presets.json",
    "application/json",
  );
$("preset-import").onclick = () => $("preset-file").click();
$("preset-file").onchange = safe(async () => {
  const file = $("preset-file").files[0];
  if (!file) return;
  try {
    if (file.size > 8000000) throw new Error("预设文件超过 8 MB");
    const parsed = JSON.parse(await file.text());
    if (
      parsed.schema !== "momo-texture-presets/v1" ||
      !Array.isArray(parsed.presets)
    )
      throw new Error("不是 Momo 预设文件");
    const incoming = validatePresets(parsed.presets),
      merged = new Map(presets.map((p) => [p.name, p]));
    for (const p of incoming) merged.set(p.name, p);
    savePresets([...merged.values()]);
    toast(`已导入 ${incoming.length} 个预设`);
  } finally {
    $("preset-file").value = "";
  }
});
$("share").onclick = safe(async () => {
  if (isStandalone()) {
    download(new TextEncoder().encode(encodeProject(state,name,undefined,{kind:workspace.kind(),format:workspace.format()})),`${projectName(name).replace(/[^\p{L}\p{N}._-]+/gu,"_")}.momo-texture.json`,"application/json");
    toast("配置已导出为项目文件；接收者在同一个 HTML 中打开项目即可恢复");
    return;
  }
  const hash = encodeHash(state);
  const text = location.origin + location.pathname + hash;
  await navigator.clipboard.writeText(text);
  history.replaceState(null, "", hash);
  toast("配置链接已复制；其他电脑使用自己的工具地址加相同 #fx= 参数");
});
window.addEventListener(
  "hashchange",
  safe(() => {
    if (location.hash.startsWith("#fx="))
      replaceState(decodeHash(location.hash));
  }),
);
$("help").onclick = () => $("help-dialog").showModal();
$("close-help").onclick = () => $("help-dialog").close();
$("export").onclick = () => exportImage("png");
$("export-exr").onclick = () => exportImage("exr");
$("cancel-export").onclick = () => (cancelled = true);
$("export-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  cancelled = true;
});
$("frames-zip").onclick = () =>
  runExport("逐帧 ZIP", (progress) => atlas(progress, { frames: true }));
$("build-atlas").onclick = () =>
  runExport("图集预览", (progress) => atlas(progress, { preview: true }));
$("batch").onclick = () =>
  runExport("批量三档 PNG", async (progress) => {
    const entries = [];
    for (let i = 0; i < 3; i++) {
      checkCancel();
      const size = [256, 512, 1024][i];
      if (state.output.mode === 4) {
        const previous = state.flipbook.cell;
        state.flipbook.cell = [64, 128, 256][i];
        const { columns, rows, cell } = state.flipbook,
          total = columns * rows,
          w = columns * cell,
          h = rows * cell,
          pixels = new Float32Array(w * h * 4);
        for (let f = 0; f < total; f++) {
          checkCancel();
          const data = readPixels(
            cell,
            cell,
            (f / total) * state.animation.duration,
            state.output.precision === 16,
          );
          const ox = (f % columns) * cell,
            oy = Math.floor(f / columns) * cell;
          for (let y = 0; y < cell; y++)
            pixels.set(
              data.subarray(y * cell * 4, (y + 1) * cell * 4),
              ((oy + y) * w + ox) * 4,
            );
          progress(
            (i + f / total) / 3,
            `图集 ${i + 1} / 3，帧 ${f + 1} / ${total}`,
          );
          await pause();
        }
        entries.push({
          name: `${state.layers[0].type}_cell${cell}.png`,
          data: await encodePNG(pixels, w, h, state.output.precision),
        });
        state.flipbook.cell = previous;
      } else {
        const config = copy(state);
        config.output.custom = false;
        const [w, h] = dimensions(config, size);
        const pixels = readPixels(
          w,
          h,
          state.animation.time,
          state.output.precision === 16,
        );
        entries.push({
          name: `${state.layers[0].type}_${w}x${h}.png`,
          data: await encodePNG(pixels, w, h, state.output.precision),
        });
      }
      progress((i + 1) / 3, `分辨率 ${i + 1} / 3`);
      await pause();
    }
    checkCancel();
    download(encodeZIP(entries), state.layers[0].type + "_batch.zip");
  });
$("copy-image").onclick = () =>
  runExport("复制当前输出", async (progress) => {
    if (state.output.mode === 4) throw new Error("翻转书请使用图集或逐帧导出");
    const [w, h] = dimensions(state);
    const bytes = await encodePNG(readPixels(w, h), w, h, 8);
    checkCancel();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": new Blob([bytes], { type: "image/png" }),
        }),
      ]);
      progress(1, "已复制 PNG8 图片");
    } catch (error) {
      if (!isStandalone()) throw error;
      download(bytes, `${state.layers[0].type}_${w}x${h}.png`, "image/png");
      progress(1, "当前浏览器不允许复制图片，已下载 PNG8");
      toast("当前浏览器不允许复制图片，已下载 PNG8");
    }
  });
$("diagnostics").onclick = safe(async () => {
  if (diagnosticsRunning) {
    cancelled = true;
    return;
  }
  if (busy) throw new Error("等待导出结束后再检查");
  busy = true;
  diagnosticsRunning = true;
  cancelled = false;
  lockEditor(true);
  playing = false;
  updatePlay();
  $("diagnostics").textContent = "停止检查";
  const failures = [],
    blank = [],
    results = [];
  try {
    for (let i = 0; i < CATALOG.length; i++) {
      if (cancelled) break;
      const type = CATALOG[i],
        s = defaults();
      s.layers[0] = newLayer(type.id);
      const started = performance.now();
      try {
        const data = exportRenderer.draw(s, 64, 64, {
          read: true,
          float: renderer.float,
          time: 0.75,
        });
        let min = Infinity,
          max = -Infinity,
          sum = 0;
        for (let p = 0; p < data.length; p += 4) {
          if (!Number.isFinite(data[p])) throw new Error("非有限采样");
          min = Math.min(min, data[p]);
          max = Math.max(max, data[p]);
          sum += data[p];
        }
        if (max - min < 0.00001) blank.push(type.id);
        results.push({
          type: type.id,
          min,
          max,
          mean: sum / 4096,
          ms: performance.now() - started,
        });
      } catch (error) {
        failures.push({ type: type.id, error: error.message });
      }
      $("diagnostics-result").textContent =
        `已检查 ${i + 1} / ${CATALOG.length}，失败 ${failures.length}，常量输出 ${blank.length}`;
      await pause();
    }
    $("diagnostics-result").textContent = JSON.stringify(
      {
        checked: results.length + failures.length,
        failed: failures.length,
        constant: blank,
        failures,
        cancelled,
        precision: renderer.float ? "float32" : "8bit",
        resolution: 64,
        time: 0.75,
      },
      null,
      2,
    );
    const report = {
      schema: "momo-texture-diagnostics/v1",
      date: new Date().toISOString(),
      results,
      failures,
      constant: blank,
      cancelled,
    };
    download(
      new TextEncoder().encode(JSON.stringify(report, null, 2)),
      "momo-texture-diagnostics.json",
      "application/json",
    );
  } finally {
    busy = false;
    diagnosticsRunning = false;
    lockEditor(false);
    $("diagnostics").textContent = `检查全部 ${CATALOG.length} 种图案`;
    dirty = true;
    scheduleThumbnail();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    busy ||
    document.querySelector("dialog[open]") ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)
  )
    return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "z") {
    event.preventDefault();
    $(event.shiftKey ? "redo" : "undo").click();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && key === "y") {
    event.preventDefault();
    $("redo").click();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
    const index = BY_ID.get(state.layers[active].type).index;
    chooseType(
      CATALOG[
        (index + (key === "arrowup" || key === "arrowleft" ? -1 : 1) + CATALOG.length) %
          CATALOG.length
      ].id,
    );
  } else if (key === " ") {
    event.preventDefault();
    $("play").click();
  } else if (key === "r") $("random").click();
  else if (key === "t") $("tile").click();
  else if (key === "e") $("export").click();
});
const framesExport=$("frames-zip").onclick,batchExport=$("batch").onclick;
function exportSelected(kind,format){if(kind==="frames")return framesExport();if(kind==="batch")return batchExport();if(kind==="atlas")return runExport("生成图集",progress=>atlas(progress,{format}));return exportImage(format);}
workspace=createWorkspace({
  initialExport,
  getState:()=>state,active:()=>active,isGrab:()=>grab,isBusy:()=>busy,
  disableGrab:()=>{grab=false;$("grab").setAttribute("aria-pressed","false");},
  pause:()=>{playing=false;updatePlay();},
  toggleVisible:()=>{mutate(()=>state.layers[active].enabled=!state.layers[active].enabled);buildLayer();},
  preferenceChanged:saveUI,saveDraft,buildLibrary,
  outputMode:(mode)=>{mutate(()=>state.output.mode=mode);buildOutput();},
  canFloat:()=>renderer.float,
  export:(kind,format)=>exportSelected(kind,format),
  renameProject:(value)=>{name=projectName(value);$("project-name").value=name;persist();},
  saveProject:safe(()=>{name=projectName($("project-name").value);saveDraft();download(new TextEncoder().encode(encodeProject(state,name,undefined,{kind:workspace.kind(),format:workspace.format()})),`${name.replace(/[^\p{L}\p{N}._-]+/gu,"_")}.momo-texture.json`,"application/json");toast("项目文件已保存");}),
  openProject:safe(async(file)=>{try{if(!file)return;if(file.size>2_000_000)throw new Error("项目文件不能超过 2 MB");const project=decodeProject(await file.text());name=project.name;$("project-name").value=name;workspace.setSelection(project.export);replaceState(project.state);saveDraft();toast("项目已打开");}finally{$("project-file").value="";}}),
},uiSettings);
$("project-name").value=name;
$("export").onclick=()=>exportSelected(workspace.kind(),"png");
$("export-exr").onclick=()=>exportSelected(workspace.kind(),"exr");
window.addEventListener("beforeunload",()=>{if(uiSettings.autosave&&projectEdited)saveDraft();});
rebuild();
buildLibrary();
initializing=false;
$("draft-status").textContent=restoredDraft?"已恢复本机草稿":uiSettings.autosave?"修改后自动保存草稿":"自动草稿已暂停";
requestAnimationFrame(tick);
