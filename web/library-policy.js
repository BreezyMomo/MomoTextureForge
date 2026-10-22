import {messageError} from './message-catalog.js';
import {node} from './tree-model.js';

// Curated presets use current definitions directly. No retired-ID redirects.
export const LIBRARY_PRESETS=[
  {id:'puzzle-corner',type:'PuzzlePiece',alias:'拼图角块',params:{0:1,1:1,2:0,3:0}},
  {id:'puzzle-edge',type:'PuzzlePiece',alias:'拼图边块',params:{0:1,1:1,2:0,3:-1}},
  {id:'puzzle-tabs',type:'PuzzlePiece',alias:'四向凸耳拼图',params:{0:1,1:1,2:1,3:1}},
  {id:'puzzle-sockets',type:'PuzzlePiece',alias:'四向凹口拼图',params:{0:-1,1:-1,2:-1,3:-1}},
  {id:'puzzle-square',type:'PuzzlePiece',alias:'方头卡扣拼图',params:{9:1,10:.2}},
  {id:'puzzle-dovetail',type:'PuzzlePiece',alias:'燕尾接口拼图',params:{9:2,10:.45}},
  {id:'puzzle-wave',type:'PuzzlePiece',alias:'波浪接口拼图',params:{9:3,10:.7}},
  {id:'puzzle-rounded',type:'PuzzlePiece',alias:'圆角主体拼图',params:{11:.18,12:.18,13:.18,14:.18}},
  {id:"square-gradient",type:"ShapeGradient",alias:"方形渐变",params:{0:1,1:.62,2:1}},
  {
    "id": "honeycomb",
    "type": "HexGrid",
    "alias": "蜂巢网格",
    "params": {
      "2": 8,
      "1": 0.24,
      "3": 0
    }
  },
  {
    "id": "narrow-ring",
    "type": "RingGradient",
    "alias": "窄环渐变",
    "params": {
      "0": 0.62,
      "1": 0.0125
    }
  }
];
const SYNONYMS={CompassTick:'罗盘刻度 仪表刻度',Dots:'交错点阵',Halftone:'网点 印刷网点',RingPulse:'多环脉冲',ConeGradient:'扫光 扇形渐变',SphericalGradient:'球形柔光',ShapeGradient:'金字塔 方形渐变',RadialStreak:'径向拉丝',Thorn:'尖刺',PuzzlePiece:'拼图块',Curl:'旋度噪声',RibbonFade:'拖尾',Zigzag:'锯齿条纹',RingGradient:'距离场环'};
export const libraryVisible=id=>true;
export const libraryVariants=id=>LIBRARY_PRESETS.filter(p=>p.type===id);
export const libraryAliases=id=>[SYNONYMS[id]||'',...libraryVariants(id).map(p=>p.alias)].join(' ');
export function libraryVariantNode(id){const p=LIBRARY_PRESETS.find(p=>p.id===id);if(!p)throw messageError("ui.patternPresetNotFound");const n=node('shape',p.type);n.name=p.alias;for(const [slot,value] of Object.entries(p.params))n.params[slot]=value;return n;}
