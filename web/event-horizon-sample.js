import {node} from './tree-model.js';

// Background generation → lens postprocess → transparent foreground → shared finish.
export function eventHorizonSample(){
 const background=Object.assign(node('shape','EventHorizonNebula'),{
  "name": "01 · 星云烟雾与恒星（背景）",
  "params": [
    2057,
    2,
    3,
    374015,
    16717024,
    0.45,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "color": {
    "mode": "preserve",
    "fill": "gradient",
    "low": "#000000",
    "high": "#ffffff"
  },
  "transform": {
    "x": 0.5,
    "y": 0.5,
    "width": 1,
    "height": 1,
    "rotation": 0,
    "mirrorX": false,
    "pivotX": 0.5,
    "pivotY": 0.5,
    "fit": "stretch",
    "lockAspect": false
  },
  "postFx": [
    0,
    0,
    16,
    0.6,
    0,
    0,
    0
  ],
  "postEffects": {
    "gravitationalLens": {
      "enabled": true,
      "lensingStrength": 0.3,
      "magnification": 0.84,
      "centerX": 0.54,
      "centerY": 0.53
    }
  },
  "effectOrder": [
    "gravitationalLens"
  ],
  "tracks": {},
  "timing": {
    "start": 0,
    "end": 1,
    "from": 0,
    "to": 1,
    "cycles": 1,
    "loop": false,
    "pingpong": false,
    "ease": "linear",
    "outside": "hold",
    "frozen": false,
    "at": 0,
    "offset": 0,
    "curve": []
  }
});
 const blackHole=Object.assign(node('shape','EventHorizonBlackHole'),{
  "name": "02 · 黑洞与吸积盘（透明前景）",
  "params": [
    2057,
    2,
    13.5,
    25,
    0.7,
    2.95,
    2.5,
    0.38,
    2,
    2,
    0.54,
    0.53,
    0,
    0,
    0,
    0
  ],
  "color": {
    "mode": "preserve",
    "fill": "gradient",
    "low": "#000000",
    "high": "#ffffff"
  },
  "transform": {
    "x": 0.5,
    "y": 0.5,
    "width": 1,
    "height": 1,
    "rotation": 0,
    "mirrorX": false,
    "pivotX": 0.5,
    "pivotY": 0.5,
    "fit": "stretch",
    "lockAspect": false
  },
  "postFx": [
    0,
    0,
    16,
    0.6,
    0,
    0,
    0
  ],
  "postEffects": {},
  "effectOrder": [],
  "tracks": {},
  "timing": {
    "start": 0,
    "end": 1,
    "from": 0,
    "to": 1,
    "cycles": 1,
    "loop": false,
    "pingpong": false,
    "ease": "linear",
    "outside": "hold",
    "frozen": false,
    "at": 0,
    "offset": 0,
    "curve": []
  }
});
 const root=Object.assign(node('group'),{
  "name": "引力视界 · 全程序绘制",
  "params": [
    0.62,
    0,
    8,
    0,
    0.5,
    0.25,
    1,
    0.2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "color": {
    "mode": "preserve",
    "fill": "gradient",
    "low": "#000000",
    "high": "#ffffff"
  },
  "transform": {
    "x": 0.5,
    "y": 0.5,
    "width": 1,
    "height": 1,
    "rotation": 0,
    "mirrorX": false,
    "pivotX": 0.5,
    "pivotY": 0.5,
    "fit": "stretch",
    "lockAspect": false
  },
  "postFx": [
    0,
    0.4,
    12,
    0.5,
    0,
    0,
    0
  ],
  "postEffects": {
    "bloom": {
      "enabled": true
    },
    "vignette": {
      "enabled": true,
      "strength": 0.3,
      "range": 0.95,
      "top": true,
      "bottom": true,
      "left": true,
      "right": true,
      "color": "#01030c"
    }
  },
  "effectOrder": [
    "bloom",
    "vignette"
  ],
  "tracks": {},
  "timing": {
    "start": 0,
    "end": 1,
    "from": 0,
    "to": 1,
    "cycles": 1,
    "loop": false,
    "pingpong": false,
    "ease": "linear",
    "outside": "hold",
    "frozen": false,
    "at": 0,
    "offset": 0,
    "curve": []
  }
},{children:[background,blackHole]});
 return {nameKey:'examples.eventHorizon.name',description:'examples.eventHorizon.description',category:'composition',tags:['examples.generatorCompositing'],previewTime:0,output:{
  "width": 1024,
  "height": 1024,
  "mode": "color",
  "alpha": false,
  "depth": 8,
  "seconds": 24,
  "exportSeconds": 24,
  "fps": 30,
  "frames": 720,
  "columns": 12,
  "loopExport": true,
  "gif": {
    "colors": 256,
    "palette": "global",
    "dither": false,
    "repeat": true,
    "alphaThreshold": 128
  },
  "exrZip": true,
  "background": "#000000",
  "normal": 3,
  "normalAlgorithm": "sobel",
  "normalFlipX": false,
  "normalFlipY": false,
  "normalInvert": false,
  "normalSmooth": 0,
  "channels": [
    0,
    2,
    3,
    8
  ],
  "channelSources": [
    null,
    null,
    null,
    null
  ]
},root};
}
