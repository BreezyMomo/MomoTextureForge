import { BUILTIN } from "./definition-runtime.js";
export const CATEGORIES = BUILTIN.categories.map((category,index)=>({...category,id:BUILTIN.definition.categories[index].id}));
export const CATALOG = [...BUILTIN.catalog];
export const BY_ID = new Map(CATALOG.map((type,index)=>[type.id,{...type,index}]));
export const PALETTES = [
  ["纯黑白", ["#000000", "#ffffff"], "palettes.monochrome"],
  ["纸色", ["#16140f", "#c8b997", "#fff3d1"], "palettes.paper"],
  ["铁锈", ["#100e0b", "#8c2917", "#ffac67"], "palettes.rust"],
  ["余烬", ["#050000", "#e2390b", "#fffac0"], "palettes.embers"],
  ["寒冰", ["#020d20", "#2388ac", "#e0ffff"], "palettes.ice"],
  ["青衿", ["#08171a", "#397d79", "#c6ece2"], "palettes.teal"],
  ["纸墨", ["#06080a", "#6c7373", "#eee4d3"], "palettes.ink"],
  ["血月", ["#10030d", "#af1840", "#ffe0db"], "palettes.bloodMoon"],
  ["鎏金", ["#090703", "#b67b18", "#fff3b7"], "palettes.gold"],
  ["紫晶", ["#0c031f", "#844add", "#f1d5ff"], "palettes.amethyst"],
  ["暮色", ["#080e20", "#925784", "#ffc482"], "palettes.dusk"],
  ["极光", ["#030c1a", "#167e6e", "#b0ffb7"], "palettes.aurora"],
].map(([name, colors, nameKey]) => ({
  name,nameKey,
  stops: colors.map((color, i) => ({
    position: i / (colors.length - 1),
    color,
  })),
}));
