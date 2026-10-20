// Optional DOM integration test. WebGL is a stub here; this does not assert GPU output.
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { CATALOG, BY_ID } from "../web/catalog.js";
const { Window } = await import(pathToFileURL(process.argv[2]).href);
const window = new Window({ url: "http://127.0.0.1:8787" });
window.document.write(
  await readFile(new URL("./fixtures/legacy-editor.html", import.meta.url), "utf8"),
);
const constants = {
  MAX_TEXTURE_SIZE: 3379,
  NO_ERROR: 0,
  FRAMEBUFFER_COMPLETE: 36053,
};
const gl = new Proxy(
  {},
  {
    get: (_, name) => {
      if (name in constants) return constants[name];
      if (name === "getExtension") return () => ({});
      if (name === "getParameter") return () => 8192;
      if (name === "getShaderParameter" || name === "getProgramParameter")
        return () => true;
      if (name === "getError") return () => 0;
      if (name === "checkFramebufferStatus") return () => 36053;
      if (
        name === "createShader" ||
        name === "createProgram" ||
        name === "createFramebuffer" ||
        name === "createTexture"
      )
        return () => ({});
      if (name === "getUniformLocation") return () => null;
      if (String(name) === String(name).toUpperCase()) return 1;
      return () => {};
    },
  },
);
window.HTMLCanvasElement.prototype.getContext = function (type) {
  return type === "webgl2" ? gl : { drawImage() {}, putImageData() {} };
};
window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
for (const name of [
  "window",
  "document",
  "location",
  "history",
  "navigator",
  "localStorage",
])
  Object.defineProperty(globalThis, name, {
    value: name === "window" ? window : window[name],
    configurable: true,
  });
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = () => 0;
await import("../web/app.js");
const $ = (id) => window.document.getElementById(id),
  change = (id, value) => {
    $(id).value = value;
    $(id).dispatchEvent(new window.Event("change"));
  };
assert.equal(window.document.querySelectorAll(".type-item").length, CATALOG.length);
assert.equal($("type-select").options.length, CATALOG.length);
assert.equal($("layers-0-params-0").value, "0.62");
change("type-select", "Circle");
assert.equal($("layers-0-type").value, "Circle");
assert.equal($("current-title").textContent, "合成预览");
change("layers-0-params-0", "0.42");
assert.equal($("layers-0-params-0").value, "0.42");
window.document.querySelector('[data-key="layers.0.params.0"]').click();
assert.match($("key-summary").textContent, /半径/);
$("time").value = "1";
$("time").dispatchEvent(new window.Event("input"));
change("layers-0-params-0", "0.8");
assert.equal(
  window.document.querySelector('[data-key="layers.0.params.0"]').textContent,
  "◆2",
);
change("output-mode", "3");
assert.equal(
  window.document.querySelectorAll('[id^="output-channels-"]').length,
  4,
);
change("output-mode", "2");
assert.ok($("output-normal"));
change("export-kind", "atlas");
assert.equal($("flipbook-preview").hidden, false);
$("preset-name").value = "DOM 测试";
$("preset-save").click();
assert.equal(
  window.document.querySelectorAll(".preset-row").length,
  1,
  $("toast").textContent,
);
$("search").value = "Circle";
$("search").dispatchEvent(new window.Event("input"));
assert.equal(window.document.querySelectorAll(".type-item").length, 2);
$("keep").checked = true;
$("keep").dispatchEvent(new window.Event("change"));
assert.ok(window.localStorage.getItem("momo-texture-forge:keep"));
$("reset").click();
assert.equal($("layers-0-type").value, "Circle");
assert.equal($("layers-0-params-0").value, "0.62");
assert.equal($("key-track").children.length, 0);
$("undo").click();
assert.equal($("layers-0-type").value, "Circle");
assert.equal($("layers-0-params-0").value, "0.8");
async function importPresets(text) {
  const file = new window.File([text], "presets.json", {
    type: "application/json",
  });
  Object.defineProperty($("preset-file"), "files", {
    value: [file],
    configurable: true,
  });
  $("preset-file").dispatchEvent(new window.Event("change"));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
const original = JSON.parse(
  window.localStorage.getItem("momo-texture-forge:presets"),
);
await importPresets(
  JSON.stringify({
    schema: "momo-texture-presets/v1",
    presets: [{ ...original[0], name: "导入测试" }],
  }),
);
assert.equal(window.document.querySelectorAll(".preset-row").length, 2);
const validSaved = window.localStorage.getItem("momo-texture-forge:presets");
await importPresets(
  JSON.stringify({
    schema: "momo-texture-presets/v1",
    presets: [
      { ...original[0], name: "先有效" },
      { name: "最后无效", state: { version: 99 } },
    ],
  }),
);
assert.equal(
  window.localStorage.getItem("momo-texture-forge:presets"),
  validSaved,
  "Failed import must not partially merge presets",
);
assert.match($("toast").textContent, /版本/);
for (const type of CATALOG) {
  change("type-select", type.id);
  const labels = [
    ...$("param-panel").querySelectorAll(".param-head label"),
  ].map((n) => n.textContent);
  assert.deepEqual(
    labels,
    type.parameters.filter((p) => !(type.id === "Star" && [1,5].includes(p.slot)) && !(type.id === "BezierRibbon" && p.slot===12)).map((p) => p.label),
    type.id + " wrong controls",
  );
}
change("layers-0-type", "Circle");
change("layers-0-params-1", "0.2");
change("layers-0-type", "Brick");
assert.equal($("layers-0-params-0").value, "12");
$("undo").click();
assert.equal($("layers-0-type").value, "Circle");
assert.equal($("layers-0-params-1").value, "0.2");
change("layers-0-mask", "FBM");
assert.ok($("layers-0-maskParams-0"));
assert.ok($("layers-0-maskParams-4"));
change("layers-0-maskParams-0", "7");
window.document.querySelector('[data-key="layers.0.maskParams.0"]').click();
assert.match($("key-summary").textContent, /蒙版 八度/);
change("layers-0-mask", "Circle");
assert.equal($("layers-0-maskParams-0").value, "0.62");
assert.equal($("layers-0-maskParams-4"), null);
assert.doesNotMatch($("key-summary").textContent, /蒙版 八度/);
change("layers-0-type", "Gear");
assert.equal($("layers-0-params-profile").value, "square");
change("layers-0-params-profile", "triangle");
assert.equal($("layers-0-params-6").value, "0");
$("undo").click();
assert.equal($("layers-0-params-profile").value, "square");
change("layers-0-params-profile", "trapezoid");
assert.equal($("layers-0-params-6").value, "0.4");
change("layers-0-params-6", "0.25");
assert.equal($("layers-0-params-profile").value, "custom");
window.document.querySelector('[data-key="layers.0.params.6"]').click();
assert.match($("key-summary").textContent, /齿顶宽度/);
change("layers-0-mask", "Gear");
change("layers-0-maskParams-profile", "triangle");
assert.equal($("layers-0-maskParams-6").value, "0");
assert.equal($("layers-0-params-6").value, "0.25");
// Background uses the existing state fields, and must remain undoable and persisted.
assert.equal(window.document.querySelectorAll("#output-alpha").length, 1);
assert.ok($("background-panel").textContent.includes("透明背景"));
assert.equal($("output-alpha").checked, false);
$("output-alpha").click();
assert.equal($("output-alpha").checked, true);
$("undo").click();
assert.equal($("output-alpha").checked, false);
const beforeBackground = $("background-color").value;
$("background-color").value = "#a04080";
$("background-color").dispatchEvent(new window.Event("input"));
assert.equal(
  $("color-stops").querySelector('input[type="color"]').value,
  "#a04080",
);
$("undo").click();
assert.equal($("background-color").value, beforeBackground);
$("redo").click();
assert.equal($("background-color").value, "#a04080");
$("output-alpha").click();
$("keep").checked = true;
$("keep").dispatchEvent(new window.Event("change"));
const backgroundSaved = JSON.parse(
  window.localStorage.getItem("momo-texture-forge:keep"),
);
assert.equal(backgroundSaved.output.alpha, true);
assert.equal(backgroundSaved.stops[0].color, "#a04080");
assert.equal($("output-seamless").checked, false);
$("output-seamless").click();
assert.equal($("tile").getAttribute("aria-pressed"), "true");
assert.match($("seamless-summary").textContent, /形状跨边缘重复/);
assert.equal($("output-seamBlend"), null);
change("output-seamMode", "1");
assert.ok($("output-seamBlend"));
assert.match($("seamless-summary").textContent, /边缘融合/);
change("output-seamBlend", "0.3");
const seamSaved = JSON.parse(
  window.localStorage.getItem("momo-texture-forge:keep"),
);
assert.equal(seamSaved.version, 5);
assert.equal(seamSaved.output.seamless, true);
assert.equal(seamSaved.output.seamBlend, 0.3);
$("output-seamless").click();
$("undo").click();
assert.equal($("output-seamless").checked, true);
change("output-seamMode", "0");
change("layers-0-type", "Brick");
change("layers-0-params-0", "7");
assert.equal($("layers-0-params-0").value, "7");
assert.match($("seamless-summary").textContent, /8 列 × 8 行/);
assert.equal($("output-seamBlend"), null);
change("layers-0-type", "Star");
assert.equal($("layers-0-params-5").value,"0");
assert.equal($("layers-0-params-1"),null);
change("layers-0-params-5","1");
assert.ok($("layers-0-params-1"));
change("layers-0-params-1","0.12");
$("undo").click();
assert.equal($("layers-0-params-1").value,"0.06");
change("layers-0-type","BezierRibbon");
assert.equal($("layers-0-params-11").value,"1");
const curve = window.document.querySelector(".curve-editor");
assert.ok(curve);
curve.setPointerCapture=()=>{};
curve.getBoundingClientRect=()=>({left:0,top:0,width:300,height:300});
curve.querySelector('[data-point="1"]').dispatchEvent(new window.PointerEvent("pointerdown",{bubbles:true,button:0,pointerId:1}));
curve.dispatchEvent(new window.PointerEvent("pointermove",{bubbles:true,clientX:150,clientY:50,pointerId:1}));
curve.dispatchEvent(new window.PointerEvent("pointerup",{bubbles:true,pointerId:1}));
assert.equal($("layers-0-params-2").value,"0");
assert.equal($("layers-0-params-3").value,"1");
$("undo").click();
assert.equal($("layers-0-params-2").value,"-0.4");
change("layers-0-arrange-0","1");
change("layers-0-arrange-1","3");
change("layers-0-arrange-2","2");
assert.match(window.document.querySelector('[data-arrangement-note="layers.0.arrange"]').textContent,/6 个/);
window.document.querySelector('[data-key="layers.0.arrange.1"]').click();
assert.match($("key-summary").textContent,/网格列数/);
change("layers-0-arrange-0","8");
assert.equal($("layers-0-arrange-1"),null);
assert.ok($("layers-0-arrange-3"));
change("layers-0-mask","BezierRibbon");
assert.ok($("layers-0-maskParams-11"));
change("layers-0-maskArrange-0","7");
assert.ok($("layers-0-maskArrange-11"));
const authored=JSON.parse(window.localStorage.getItem("momo-texture-forge:keep"));
assert.equal(authored.version,5);
assert.equal(authored.layers[0].arrange[0],8);
assert.equal(authored.layers[0].maskArrange[0],7);
// Workspace panes, context, view-only changes, library and layout shortcuts.
window.document.querySelector('[data-pane="arrange"]').click();
assert.equal($("pane-arrange").hidden,false);assert.equal($("pane-shape").hidden,true);
window.document.querySelectorAll('.layer-tab')[1].click();
assert.match($("editing-context").textContent,/图层 2.*分形噪声/);
$("context-visible").click();assert.equal($("context-visible").textContent,"显示中");
$("undo").click();
window.document.querySelectorAll('.layer-tab')[0].click();
change("type-select","Splat");
change("layers-0-params-0","0.47");change("type-select","Leaf");change("type-select","Splat");
assert.equal($("layers-0-params-0").value,"0.47","Switching types must restore temporary parameters");
$("search").value="溅射形";$("search").dispatchEvent(new window.Event("input"));
window.document.querySelector('.favorite-type').click();
window.document.querySelector('[data-filter="favorites"]').click();
assert.equal(window.document.querySelectorAll('.type-item').length,1);
change("library-view","grid");assert.equal($("type-list").classList.contains("library-grid"),true);
const beforeView=window.localStorage.getItem("momo-texture-forge:keep");
change("view-zoom","2");change("view-background","white");$("view-pan").click();
$("canvas-stage").setPointerCapture=()=>{};
$("canvas-stage").dispatchEvent(new window.PointerEvent("pointerdown",{button:0,clientX:100,clientY:120,pointerId:7}));
$("canvas-stage").dispatchEvent(new window.PointerEvent("pointermove",{clientX:130,clientY:140,pointerId:7}));
$("canvas-stage").dispatchEvent(new window.PointerEvent("pointerup",{pointerId:7}));
assert.match($("preview-surface").style.transform,/translate\(30px,20px\)/);
assert.equal(window.localStorage.getItem("momo-texture-forge:keep"),beforeView,"Viewing controls must not edit texture state");
assert.equal($("canvas-stage").dataset.background,"white");
change("layers-0-arrange-0","1");change("layers-0-arrange-1","3");change("layers-0-arrange-2","2");
$("arrangement-panel").querySelectorAll('.layout-shortcuts button')[1].click();
assert.equal($("layers-0-arrange-4").value,"0.31");assert.equal($("layers-0-arrange-5").value,"0.5");
const arrangementChoice=(label,value)=>{const select=$("arrangement-panel").querySelector(`select[aria-label="${label}"]`);assert.ok(select,label);select.value=String(value);select.dispatchEvent(new window.Event("change"));};
assert.equal($("layers-0-arrange-0").options.length,7,"six families plus off");
arrangementChoice("网格类型",11);assert.ok($("layers-0-arrange-38"));
change("layers-0-arrange-0","7");change("layers-0-arrange-32","0");
arrangementChoice("密度分布",12);assert.equal($("layers-0-arrange-32").value,"0");assert.ok($("layers-0-arrange-39"));
arrangementChoice("密度分布",7);assert.equal($("layers-0-arrange-39"),null);
change("layers-0-arrange-0","8");assert.equal($("layers-0-arrange-33").value,"1");
change("layers-0-arrange-33","3");assert.ok($("layers-0-arrange-34"));
change("layers-0-arrange-0","5");arrangementChoice("螺旋类型",9);assert.ok($("layers-0-arrange-35"));
change("layers-0-arrange-0","6");assert.ok($("layers-0-arrange-30"));
change("layers-0-arrange-0","10");assert.ok($("layers-0-arrange-37"));
change("export-kind","frames");assert.match($("export-summary").textContent,/帧/);assert.equal($("export-format").disabled,true);
change("export-kind","atlas");assert.equal($("flipbook-preview").hidden,false);
change("export-kind","single");assert.equal($("flipbook-preview").hidden,true);
await new Promise(r=>setTimeout(r,300));
const draft=JSON.parse(window.localStorage.getItem("momo-texture-forge:draft"));
assert.equal(draft.schema,"momo-texture-project/v1");assert.equal(draft.state.layers[0].type,"Splat");
const originalName=$("project-name").value;
Object.defineProperty($("project-file"),"files",{value:[new window.File(['{"schema":"foreign"}'],"bad.json")],configurable:true});
$("project-file").dispatchEvent(new window.Event("change"));await new Promise(r=>setTimeout(r,0));
assert.equal($("layers-0-type").value,"Splat");assert.equal($("project-name").value,originalName);
assert.match($("toast").textContent,/格式/);
const validProject=structuredClone(draft);validProject.name="打开的项目";validProject.state.layers[0].params[0]=.33;
Object.defineProperty($("project-file"),"files",{value:[new window.File([JSON.stringify(validProject)],"valid.json")],configurable:true});
$("project-file").dispatchEvent(new window.Event("change"));await new Promise(r=>setTimeout(r,0));
assert.equal($("project-name").value,"打开的项目");assert.equal($("layers-0-params-0").value,"0.33");
assert.match($("toast").textContent,/项目已打开/);
console.log(
  "DOM integration PASS: catalogue, parameters, keyframes, panels, preset import atomicity, search, persistence, reset and undo. WebGL mocked.",
);
window.happyDOM.abort();
