// Capture fixtures only. Real application text uses semantic message IDs.
import {messageText} from '../web/message-catalog.js';
import {walk} from '../web/tree-model.js';
import {BY_ID} from '../web/catalog.js';
const args=process.argv.slice(2),index=args.indexOf('--language');
export const language=index>=0?args[index+1]:process.env.DOCS_LANGUAGE??'zh-CN';
export const captureSections=index<0?args:args.filter((_,i)=>i!==index&&i!==index+1);
if(!['zh-CN','en'].includes(language))throw Error('Capture language must be zh-CN or en');
export const label=key=>messageText(key,language);
export const inLanguage=(chinese,english)=>language==='en'?english:chinese;
const names={
 "未命名画布": "Untitled canvas",
 "作品": "Canvas",
 "召唤法阵": "Summoning circle",
 "外环": "Outer ring",
 "中环": "Middle ring",
 "内环": "Inner ring",
 "环形星光": "Orbiting stars",
 "呼吸星形": "Breathing star",
 "动态焦散材质": "Animated caustics material",
 "火焰序列": "Fire sequence",
 "内容边界对照": "Content boundary comparison",
 "左侧：裁切内容": "Left: clip content",
 "右侧：允许超出": "Right: allow overflow",
 "边缘圆点": "Edge dot",
 "上方星光": "Upper star",
 "中心圆点": "Center dot",
 "无缝光晕接续": "Seamless halo continuity",
 "跨边界星光": "Cross-boundary star",
 "中央光点": "Central glow",
 "单块拼图网格": "Single puzzle tile grid",
 "拼图接口与圆角": "Puzzle connectors and corners",
 "圆头凸耳": "Round connector",
 "方头卡扣": "Square connector",
 "梯形燕尾": "Dovetail connector",
 "波浪接口": "Wave connector",
 "呼吸圆形": "Breathing circle",
 "批量编辑与对齐": "Batch editing and alignment",
 "星形装饰": "Star decoration",
 "圆形装饰": "Circle decoration",
 "多边形装饰": "Polygon decoration",
 "同类图形批改": "Matching shape edits",
 "圆环 1": "Ring 1",
 "圆环 2": "Ring 2",
 "火焰特效混合对照": "Fire effect blending comparison",
 "画布": "Canvas",
 "动态焦散": "Water Caustics",
 "篝火": "Bonfire",
 "湍流火焰": "Turbulent Flame",
 "左侧逻辑区域边线 1": "Left logical boundary 1",
 "左侧逻辑区域边线 2": "Left logical boundary 2",
 "左侧逻辑区域边线 3": "Left logical boundary 3",
 "左侧逻辑区域边线 4": "Left logical boundary 4",
 "右侧逻辑区域边线 1": "Right logical boundary 1",
 "右侧逻辑区域边线 2": "Right logical boundary 2",
 "右侧逻辑区域边线 3": "Right logical boundary 3",
 "右侧逻辑区域边线 4": "Right logical boundary 4"
};
export const demoName=name=>language==='en'?(names[name]??name):name;
export function localizeFixture(project){const copy=structuredClone(project);copy.name=demoName(copy.name);walk(copy.root,n=>{const builtin=BY_ID.get(n.type)?.definition;n.name=language==='en'&&n.name===builtin?.name?(builtin.aliases?.en??n.name):demoName(n.name);});return copy;}
