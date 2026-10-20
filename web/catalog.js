import { BUILTIN } from "./definition-runtime.js";
export const CATEGORIES = structuredClone(BUILTIN.categories);
export const CATALOG = [...BUILTIN.catalog];
export const BY_ID = new Map(CATALOG.map((type,index)=>[type.id,{...type,index}]));
export const PALETTES = [
  ["纯黑白", ["#000000", "#ffffff"]],
  ["纸色", ["#16140f", "#c8b997", "#fff3d1"]],
  ["铁锈", ["#100e0b", "#8c2917", "#ffac67"]],
  ["余烬", ["#050000", "#e2390b", "#fffac0"]],
  ["寒冰", ["#020d20", "#2388ac", "#e0ffff"]],
  ["青衿", ["#08171a", "#397d79", "#c6ece2"]],
  ["纸墨", ["#06080a", "#6c7373", "#eee4d3"]],
  ["血月", ["#10030d", "#af1840", "#ffe0db"]],
  ["鎏金", ["#090703", "#b67b18", "#fff3b7"]],
  ["紫晶", ["#0c031f", "#844add", "#f1d5ff"]],
  ["暮色", ["#080e20", "#925784", "#ffc482"]],
  ["极光", ["#030c1a", "#167e6e", "#b0ffb7"]],
].map(([name, colors]) => ({
  name,
  stops: colors.map((color, i) => ({
    position: i / (colors.length - 1),
    color,
  })),
}));
