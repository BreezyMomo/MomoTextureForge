import {normalizeGraphicAliases} from './graphic-name.js';
import {validateParameterMetadata} from './parameter-metadata.js';
// Definitions are trusted local authoring resources, never JavaScript programs.
import {validateGenerator,GENERATOR_LIMIT,generatorSlotKey} from './generator-schema.js';
export const DEFINITION_SCHEMA = "momo.texture-pattern/v1";
export const LIBRARY_SCHEMA = "momo.texture-library/v1";
export const INDEX_SCHEMA = "momo.texture-index/v1";
export const PATTERN_ABI = "momo-pattern/16-v1";
export const SLOT_KEYS = ["R", "W", "N", "S", "D", "K", "H", "T", "A", "B", "C", "E", "F", "G", "I", "J"];
const extents = ["radius", "ring", "rectangle", "cross", "ellipse", "polygon", "capsule", "heart", "profile", "bezier"];
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const identifier = value => typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,95}$/.test(value);
const finite = Number.isFinite;
function require(condition, message) { if (!condition) throw new Error(`图案定义错误：${message}`); }
function relativePath(file, extension) {
  require(typeof file === "string" && /^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(file) && file.endsWith(extension) && !file.split("/").some(part => !part || part === "." || part === ".."), `非法资源路径 ${file}`);
  return file;
}
export const sourcePath = file => relativePath(file, ".glsl");
export const definitionPath = file => relativePath(file, ".json");
function source(spec, libraries, context) {
  require(object(spec) && ["expression", "body"].includes(spec.kind), `${context} 需要 expression 或 body`);
  require(Object.hasOwn(spec, "inline") !== Object.hasOwn(spec, "file"), `${context} 需要且只能有一个 inline/file`);
  if (spec.file !== undefined) sourcePath(spec.file);
  else require(typeof spec.inline === "string" && spec.inline.trim().length > 0 && spec.inline.length <= 65536, `${context} 公式为空或过长`);
  require(Array.isArray(spec.libraries) && spec.libraries.length <= 16 && new Set(spec.libraries).size === spec.libraries.length, `${context} 函数库列表无效`);
  for (const name of spec.libraries) require(Object.hasOwn(libraries, name), `${context} 缺少函数库 ${name}`);
}
function validateHeader(raw, schema) {
  require(object(raw) && raw.schema === schema && raw.abi === PATTERN_ABI, "目录版本或 ABI 不支持");
  require(Number.isInteger(raw.revision) && raw.revision > 0, "目录 revision 无效");
  require(Array.isArray(raw.categories) && raw.categories.length > 0 && raw.categories.length <= 64, "分类列表无效");
  const categoryIds = new Set();
  for (const category of raw.categories) {
    require(object(category) && identifier(category.id) && !categoryIds.has(category.id) && typeof category.name === "string" && category.name.trim(), "分类重复或无效");
    categoryIds.add(category.id);
  }
  require(object(raw.libraries) && Object.keys(raw.libraries).length <= 64, "函数库定义无效");
  for (const [name, library] of Object.entries(raw.libraries)) {
    require(identifier(name) && object(library) && library.abi === PATTERN_ABI, `函数库 ${name} ABI 无效`);
    sourcePath(library.file);
  }
  require(Object.hasOwn(raw.libraries, "math-v1"), "缺少宿主函数库 math-v1");
  require(Array.isArray(raw.patterns) && raw.patterns.length > 0 && raw.patterns.length <= 1024, "图案列表无效");
  return categoryIds;
}
export function validateIndex(raw) {
  validateHeader(raw, INDEX_SCHEMA);
  const ids = new Set(), files = new Set();
  for (const entry of raw.patterns) {
    require(object(entry) && identifier(entry.id) && !ids.has(entry.id), `重复或无效索引 ID ${entry?.id}`);
    const file = definitionPath(entry.file);
    require(!files.has(file), `重复配置路径 ${file}`);
    ids.add(entry.id); files.add(file);
  }
  return raw;
}
export function validateLibrary(raw,{legacyParameters=false}={}) {
  const categoryIds = validateHeader(raw, LIBRARY_SCHEMA);
  const ids = new Set(), variants = new Map(), periodicOrder = new Set();
  for (const [index, p] of raw.patterns.entries()) {
    require(object(p) && p.schema === DEFINITION_SCHEMA && p.abi === PATTERN_ABI, `图案 ${index} 版本或 ABI 无效`);
    require(identifier(p.id) && !ids.has(p.id), `重复或无效 ID ${p.id}`); ids.add(p.id);
    require(Number.isInteger(p.revision) && p.revision > 0 && p.order === index, `${p.id} revision/稳定索引无效`);
    require(typeof p.name === "string" && p.name.trim().length > 0 && p.name.length <= 128 && categoryIds.has(p.category), `${p.id} 名称或分类无效`);
    const nextVariant = variants.get(p.category) ?? 0;
    require(p.variant === nextVariant, `${p.id} 分类顺序无效`); variants.set(p.category, nextVariant + 1);
    validateGenerator(p.generator,raw.libraries);
    const parameterLimit=p.generator?GENERATOR_LIMIT:16;
    require(Array.isArray(p.defaults) && (p.generator?p.defaults.length>=16&&p.defaults.length<=parameterLimit:p.defaults.length===16) && p.defaults.every(finite), `${p.id} 默认参数数量或数值无效`);
    require(Array.isArray(p.parameters) && p.parameters.length <= parameterLimit, `${p.id} 参数列表无效`);
    const slots = new Set();
    require(p.renderPadding===undefined||(finite(p.renderPadding)&&p.renderPadding>=0&&p.renderPadding<=.5&&!p.generator&&!p.outputs?.vector),`${p.id} 渲染留白需为0～0.5的公式图形参数`);
    const generatorVariables=new Set(), parameterVariables=new Set();
    for (const spec of p.parameters) {
      const metadata=validateParameterMetadata(spec,{legacy:legacyParameters});
      require(!parameterVariables.has(metadata.variable), `${p.id} 参数变量名重复`);parameterVariables.add(metadata.variable);
      require(object(spec) && Number.isInteger(spec.slot) && spec.slot >= 0 && spec.slot < p.defaults.length && !slots.has(spec.slot), `${p.id} 参数槽重复或无效`); slots.add(spec.slot);
      require(spec.key === generatorSlotKey(spec.slot) && typeof metadata.label === "string" && metadata.label.trim(), `${p.id} 参数名称/绑定无效`);
      if(spec.type==='select')require(Array.isArray(spec.options)&&spec.options.length>0&&spec.options.every(o=>Number.isInteger(o.value)&&o.value>=spec.min&&o.value<=spec.max&&(typeof o.label==='string'||o.aliases!==undefined)),`${p.id} 选项无效`);
      if(p.generator){require(typeof spec.variable==='string'&&!generatorVariables.has(spec.variable),`${p.id} 生成器参数标识无效或重复`);generatorVariables.add(spec.variable);require(!spec.type||['color','select'].includes(spec.type),`${p.id} 参数类型无效`);if(spec.type==='color')require(spec.min===0&&spec.max===16777215&&spec.step===1,`${p.id} 颜色范围无效`);if(spec.type==='select')require(Array.isArray(spec.options)&&spec.options.length>0&&spec.options.every(o=>Number.isInteger(o.value)&&o.value>=spec.min&&o.value<=spec.max&&(typeof o.label==='string'||o.aliases!==undefined)),`${p.id} 选项无效`);}
      require([spec.min, spec.max, spec.step, spec.default].every(finite) && spec.min < spec.max && spec.step > 0 && spec.default >= spec.min && spec.default <= spec.max && p.defaults[spec.slot] === spec.default, `${p.id} 参数 ${spec.key} 范围/默认值无效`);
    }
    normalizeGraphicAliases(p.aliases);
    require(object(p.outputs), `${p.id} 输出无效`);
    if(p.generator)require(generatorVariables.has('seed'),`${p.id} 生成器缺少随机种子`);
    source(p.outputs.scalar, raw.libraries, p.id);
    if (p.outputs.vector !== undefined) require(object(p.outputs.vector) && p.outputs.vector.library === "vector-v1" && Object.hasOwn(raw.libraries, "vector-v1"), `${p.id} 矢量 ABI 无效`);
    require(object(p.seamless) && ["blend", "repeat", "periodic"].includes(p.seamless.kind), `${p.id} 无缝策略无效`);
    if (p.seamless.kind === "repeat") require(extents.includes(p.seamless.extent), `${p.id} 外接范围算法无效`);
    if (p.seamless.kind === "periodic") {
      source(p.seamless.source, raw.libraries, `${p.id} 周期`);
      require(p.seamless.countSlot===undefined || (Number.isInteger(p.seamless.countSlot)&&p.seamless.countSlot>=0&&p.seamless.countSlot<8&&slots.has(p.seamless.countSlot)), `${p.id} 周期数量槽无效`);
      require(Number.isInteger(p.seamless.order) && p.seamless.order >= 0 && !periodicOrder.has(p.seamless.order), `${p.id} 周期顺序无效`); periodicOrder.add(p.seamless.order);
      require([1, 2].includes(p.seamless.countMultiplier) && typeof p.seamless.evenCount === "boolean" && typeof p.seamless.rows === "boolean", `${p.id} 周期参数策略无效`);
    }
    require(object(p.editor) && ["parameters", "gear", "star", "bezier"].includes(p.editor.kind), `${p.id} 编辑器能力无效`);
    const editorSlots = {parameters:[],gear:[0,1,2,3,4,5,6],star:[0,1,2,3,4,5],bezier:[0,1,2,3,4,5,6,7,8,9,10,11,12]}[p.editor.kind];
    require(editorSlots.every(slot => slots.has(slot)), `${p.id} 编辑器缺少参数槽`);
  }
  return raw;
}
export function validateFormula(text, kind, context) {
  require(typeof text === "string" && text.trim() && text.length <= 65536, `${context} 公式为空或过长`);
  require(!/^\s*#/m.test(text), `${context} 公式不能重定义宿主预处理指令`);
  if (kind === "expression") require(!/[;{}]/.test(text), `${context} expression 不能含语句，请使用 body`);
  else require(/\breturn\b/.test(text), `${context} body 需要返回值`);
  return text;
}
