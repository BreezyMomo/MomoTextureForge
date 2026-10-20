import {node} from './tree-model.js';

// Curated presets use current definitions directly. No retired-ID redirects.
export const LIBRARY_PRESETS=[
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
export function libraryVariantNode(id){const p=LIBRARY_PRESETS.find(p=>p.id===id);if(!p)throw Error('不存在该图案预设');const n=node('shape',p.type);n.name=p.alias;for(const [slot,value] of Object.entries(p.params))n.params[slot]=value;return n;}
