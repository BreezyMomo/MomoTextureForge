import { CATALOG, BY_ID } from "./catalog.js";
import { decodeJSON, dimensions } from "./state.js";
import { sanitizeArrangement } from "./arrangement.js";

export const PROJECT_SCHEMA = "momo-texture-project/v1";
export const DRAFT_KEY = "momo-texture-forge:draft";
export const UI_KEY = "momo-texture-forge:ui";
export const projectName = (name) => typeof name === "string" && name.trim() ? name.trim().slice(0,80) : "未命名贴图";
export function exportSelection(value, state) {
  const kind=["single","atlas","frames","batch"].includes(value?.kind)?value.kind:state.output.mode===4?"atlas":"single";
  return {kind,format:["frames","batch"].includes(kind)?"png":value?.format==="exr"?"exr":"png"};
}
export function encodeProject(state, name, date = new Date().toISOString(), selection) {
  return JSON.stringify({schema:PROJECT_SCHEMA,name:projectName(name),savedAt:date,state,export:exportSelection(selection,state)});
}
export function decodeProject(text) {
  if (typeof text !== "string" || text.length > 2_000_000) throw new Error("项目文件过大或格式无效");
  const data = JSON.parse(text);
  if (data?.schema !== PROJECT_SCHEMA) {
    if(data?.schema)throw new Error("不支持的项目格式");
    if (!data || !Array.isArray(data.layers)) throw new Error("不是贴图项目文件");
    const state=decodeJSON(text);return {name:"未命名贴图",state,export:exportSelection(null,state)};
  }
  if (!data.state || !Array.isArray(data.state.layers)) throw new Error("项目缺少图层配置");
  const state=decodeJSON(JSON.stringify(data.state));return {name:projectName(data.name),state,export:exportSelection(data.export,state)};
}
export function preferences(data = {}) {
  const ids = (value,max) => Array.isArray(value) ? [...new Set(value.filter((id)=>typeof id==="string"&&BY_ID.has(id)))].slice(0,max) : [];
  return {autosave:data?.autosave!==false,libraryView:data?.libraryView==="grid"?"grid":"list",libraryFilter:["all","favorites","recent"].includes(data?.libraryFilter)?data.libraryFilter:"all",favorites:ids(data?.favorites,CATALOG.length),recent:ids(data?.recent,24),previewBackground:["checker","black","white"].includes(data?.previewBackground)?data.previewBackground:"checker"};
}
export function recentTypes(recent, id) { return [id,...recent.filter((x)=>x!==id)].filter((x)=>BY_ID.has(x)).slice(0,24); }
export function arrangeShortcut(values, action) {
  const a = sanitizeArrangement(values); a[13]=0; a[14]=0;
  if(action==='fill'&&[3,7,12].includes(a[0])){a[5]=.5;return sanitizeArrangement(a);}
  if (action === "fill") {
    if (!a[0]) a[0]=1;
    a[6]=0;a[8]=0;a[9]=0;a[10]=0;a[12]=0;
    if (a[0]===1||a[0]===4) {a[5]=.5;a[4]=Math.floor(.95/Math.max(a[1],a[0]===4?a[2]/2:a[2])*100)/100;}
    else if (a[0]===2) {a[5]=.34;a[4]=Math.floor(Math.min(.25,1.6/a[3])*100)/100;a[15]=1;}
    else if (a[0]>=5) {a[5]=.38;a[4]=Math.min(.18,.65/Math.sqrt(a[3]))/(a[0]===8&&a[33]===1?1:Math.max(1,a[18]));}
    else {a[5]=.4;a[4]=.18;}
  }
  return sanitizeArrangement(a);
}
export function exportSummary(state, kind="single",format="png") {
  const [w,h]=dimensions(state),f=state.flipbook,frames=f.columns*f.rows;
  const alpha=state.output.mode===2?"不透明":state.output.mode===3?`A 通道：${["高度","反相高度","法线 X","法线 Y","法线 Z","0","1","0.5","法线斜率"][state.output.channels[3]]}`:state.output.alpha?"透明背景":"不透明";
  const depth=format==="exr"?"half 浮点":`PNG${state.output.precision}`;
  if(kind==="batch") return state.output.mode===4?`三档图集 PNG${state.output.precision} · 单帧 64 / 128 / 256 · 每档 ${frames} 帧 · ${alpha}`:`三档 PNG${state.output.precision} · 长边 256 / 512 / 1024 · ${alpha}`;
  if(kind==="atlas") return `${format.toUpperCase()} · ${f.columns*f.cell} × ${f.rows*f.cell} · ${depth} · ${frames} 帧（${f.columns}×${f.rows}） · 单帧 ${f.cell}×${f.cell} · ${alpha}`;
  if(kind==="frames") return `PNG${state.output.precision} ZIP · ${frames} 帧 · 单帧 ${f.cell}×${f.cell} · ${state.animation.duration} 秒 · ${alpha}`;
  return `${format.toUpperCase()} · ${w} × ${h} · ${depth} · 当前 ${state.animation.time.toFixed(2)} 秒 · ${alpha}`;
}
