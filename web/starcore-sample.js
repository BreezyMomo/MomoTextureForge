import {node} from './tree-model.js';

// Preserve the authored layer stack and six-second animation.
export function starcoreSample(){return {
 nameKey:'examples.starcoreCollapse.name',
 description:'examples.starcoreCollapse.description',
 category:'composition',
 tags:['examples.generatorCompositing','examples.loopingAnimation'],
 previewTime:.25,
 output:{
  "width": 512,
  "height": 512,
  "mode": "color",
  "alpha": false,
  "depth": 8,
  "seconds": 6,
  "exportSeconds": 6,
  "fps": 20,
  "frames": 120,
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
  "background": "#02040b",
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
},
 root:Object.assign(node("group","Circle"),{
  "name": "星核坍缩 · STARCORE",
  "packDensity": {
    "base": "Circle",
    "keys": []
  }
}, {children:[Object.assign(node("shape","StarcoreNebula"),{
  "name": "01 · 深空星云",
  "params": [
    42,
    0,
    6,
    0.94,
    1.15,
    1.5,
    1.15,
    1.1,
    0.9,
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
  "packDensity": {
    "base": "Circle",
    "keys": []
  },
  "type": "StarcoreNebula"
}, {children:[],mask:null}),
Object.assign(node("group","Circle"),{
  "name": "STARCORE · 能量引擎",
  "postFx": [
    0,
    0.55,
    14,
    0.35,
    0,
    0,
    0
  ],
  "postEffects": {
    "blur": {
      "enabled": null
    },
    "bloom": {
      "enabled": true
    },
    "sharpen": {
      "enabled": null
    },
    "chromatic": {
      "enabled": null,
      "direction": 0
    },
    "posterize": {
      "enabled": null,
      "lightSteps": 0
    },
    "pixelate": {
      "enabled": false,
      "size": 8
    },
    "vignette": {
      "enabled": false,
      "strength": 0.6,
      "range": 1,
      "top": true,
      "bottom": true,
      "left": true,
      "right": true,
      "color": "#000000"
    },
    "scanline": {
      "enabled": false,
      "density": 120,
      "speed": 1,
      "strength": 0.25,
      "phase": 0,
      "color": "#000000"
    },
    "kaleidoscope": {
      "enabled": false,
      "segments": 6,
      "rotation": 0
    },
    "mirror": {
      "enabled": false,
      "mirrorX": true,
      "mirrorY": false
    },
    "swirl": {
      "enabled": false,
      "strength": 3,
      "radius": 0.7
    },
    "edge": {
      "enabled": false,
      "width": 1,
      "strength": 1,
      "color": "#ffffff"
    },
    "tricolor": {
      "enabled": false,
      "shadow": "#000000",
      "midtone": "#808080",
      "highlight": "#ffffff"
    },
    "radialMask": {
      "enabled": false,
      "centerX": 0.5,
      "centerY": 0.5,
      "radius": 0.5,
      "feather": 0.2,
      "invert": false
    },
    "unblack": {
      "enabled": false,
      "strength": 1
    },
    "normal": {
      "enabled": false,
      "strength": 3,
      "sampleStep": 1,
      "flipY": false
    },
    "sketch": {
      "enabled": false,
      "strokeRoughness": 1.3,
      "bowing": 1,
      "strokeWidth": 1.8,
      "doubleStroke": true,
      "strokeColor": "#202020",
      "fillStyle": 2,
      "roughness": 1.3,
      "fillColor": "#e9b35f",
      "hatchAngle": -41,
      "hatchGap": 8,
      "hatchWidth": 0.8,
      "source": 0,
      "threshold": 0.5,
      "smoothing": 0.5,
      "simplify": 2,
      "seed": 1,
      "strokeOpacity": 1,
      "fillOpacity": 1,
      "maxRandomnessOffset": 2,
      "preserveVertices": false,
      "fillMultiStroke": 0,
      "fillShapeRoughnessGain": 0.8,
      "strokeDashPattern": "",
      "strokeDashOffset": 0,
      "fillDashPattern": "",
      "fillDashOffset": 0,
      "dashLength": 8,
      "dashGap": 8,
      "zigzagOffset": 8,
      "curveStepCount": 9,
      "curveFitting": 0.95,
      "curveTightness": 0,
      "pathSimplification": 0,
      "fixedDecimalPlaceDigits": -1,
      "sunburstCenterX": 0.5,
      "sunburstCenterY": 0.5,
      "sunburstRays": 72
    },
    "halftone": {
      "enabled": false,
      "dotShape": 0,
      "dotSize": 8,
      "angle": 45,
      "inkMode": 0,
      "inkColor": "#202020",
      "paperColor": "#ffffff",
      "scatter": 0,
      "seed": 1,
      "mix": 1
    },
    "dither": {
      "enabled": false,
      "ditherPattern": 0,
      "paletteMode": 0,
      "levels": 4,
      "cellSize": 2,
      "ditherStrength": 1,
      "inkColor": "#163821",
      "paperColor": "#d6efac",
      "seed": 1,
      "mix": 1
    },
    "glitch": {
      "enabled": false,
      "slices": 24,
      "displacement": 24,
      "chance": 0.35,
      "sliceAxis": 0,
      "rgbOffset": 3,
      "rate": 6,
      "phase": 0,
      "seed": 1,
      "mix": 1
    },
    "zoomBlur": {
      "enabled": false,
      "centerX": 0.5,
      "centerY": 0.5,
      "blurDistance": 40,
      "innerRadius": 0,
      "outerRadius": 1.5,
      "zoomDirection": 0,
      "quality": 1,
      "mix": 1
    },
    "kuwahara": {
      "enabled": false,
      "paintMode": 1,
      "paintRadius": 8,
      "edgeSharpness": 8,
      "anisotropy": 0.6,
      "quality": 1,
      "mix": 1
    },
    "bevel": {
      "enabled": false,
      "bevelSource": 0,
      "bevelWidth": 4,
      "lightAngle": 45,
      "elevation": 45,
      "relief": 2,
      "lightColor": "#ffffff",
      "shadowColor": "#202030",
      "mix": 1
    },
    "xdog": {
      "enabled": false,
      "lineScale": 2,
      "scaleRatio": 1.6,
      "edgeWeight": 1.05,
      "lineThreshold": -0.04,
      "lineSoftness": 0.04,
      "inkColor": "#202020",
      "paperColor": "#fff6e2",
      "retainColor": false,
      "mix": 1
    },
    "crt": {
      "enabled": false,
      "curvature": 0.15,
      "lineDensity": 180,
      "lineStrength": 0.3,
      "maskStrength": 0.2,
      "grain": 0.12,
      "flicker": 0.05,
      "rate": 12,
      "phase": 0,
      "seed": 1,
      "edgeShade": 0.25,
      "mix": 1
    },
    "ascii": {
      "enabled": false,
      "characterSet": 0,
      "glyphSize": 12,
      "colored": true,
      "invert": false,
      "inkColor": "#b0ff8f",
      "paperColor": "#101820",
      "paperOpacity": 0,
      "mix": 1
    },
    "pixelSort": {
      "enabled": false,
      "sortAxis": 0,
      "sortBy": 0,
      "descending": false,
      "lowThreshold": 0.15,
      "highThreshold": 0.9,
      "alphaThreshold": 0.2,
      "span": 64,
      "cellSize": 2,
      "mix": 1
    },
    "noiseWarp": {
      "enabled": false,
      "warpMode": 0,
      "warpX": 12,
      "warpY": 4,
      "warpScale": 64,
      "warpDetail": 3,
      "motionAngle": 90,
      "motionSpeed": 24,
      "warpMotion": 0,
      "loopSeconds": 3,
      "seed": 1,
      "mix": 1
    },
    "dissolve": {
      "enabled": false,
      "progress": 0.35,
      "dissolveStyle": 1,
      "dissolvePattern": 0,
      "dissolveScale": 48,
      "dissolveAngle": 90,
      "edgeWidth": 0.08,
      "burnColor": "#ff9d38",
      "edgeSoftness": 0.015,
      "seed": 19,
      "mix": 1
    },
    "shockwave": {
      "enabled": false,
      "progress": 0.4,
      "centerX": 0.5,
      "centerY": 0.5,
      "waveRadius": 0.9,
      "waveWidth": 64,
      "displacement": 24,
      "waveDecay": 0.6,
      "mix": 1
    },
    "liquidFusion": {
      "enabled": false,
      "fusionRadius": 16,
      "fusionThreshold": 0.35,
      "fusionSoftness": 0.06,
      "fusionColor": 0,
      "liquidColor": "#50dfc0",
      "mix": 1
    }
  },
  "effectOrder": [
    "bloom",
    "blur",
    "sharpen",
    "chromatic",
    "posterize",
    "pixelate",
    "vignette",
    "scanline",
    "kaleidoscope",
    "mirror",
    "swirl",
    "edge",
    "tricolor",
    "radialMask",
    "unblack",
    "normal",
    "sketch",
    "halftone",
    "dither",
    "glitch",
    "zoomBlur",
    "kuwahara",
    "bevel",
    "xdog",
    "crt",
    "ascii",
    "pixelSort",
    "noiseWarp",
    "dissolve",
    "shockwave",
    "liquidFusion"
  ],
  "effectPresence": {
    "bloom": true
  },
  "packDensity": {
    "base": "Circle",
    "keys": []
  }
}, {children:[Object.assign(node("shape","StarcoreAccretion"),{
  "name": "02 · 倾斜等离子吸积盘",
  "params": [
    42,
    1,
    6,
    0.94,
    1.15,
    1,
    1.15,
    1.1,
    0.9,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "blend": "add",
  "color": {
    "mode": "preserve",
    "fill": "gradient",
    "low": "#000000",
    "high": "#ffffff"
  },
  "packDensity": {
    "base": "Circle",
    "keys": []
  },
  "type": "StarcoreAccretion"
}, {children:[],mask:null}),
Object.assign(node("shape","StarcoreCore"),{
  "name": "03 · 炽热坍缩星核",
  "params": [
    42,
    2,
    6,
    0.94,
    1.15,
    1,
    1.15,
    1.1,
    0.9,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "blend": "add",
  "color": {
    "mode": "preserve",
    "fill": "gradient",
    "low": "#000000",
    "high": "#ffffff"
  },
  "packDensity": {
    "base": "Circle",
    "keys": []
  },
  "type": "StarcoreCore"
}, {children:[],mask:null}),
Object.assign(node("shape","StarcoreArcs"),{
  "name": "04 · 电弧轨道与喷射粒子",
  "params": [
    42,
    3,
    6,
    0.94,
    1.15,
    1,
    1.15,
    1.1,
    0.9,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "blend": "add",
  "color": {
    "mode": "preserve",
    "fill": "gradient",
    "low": "#000000",
    "high": "#ffffff"
  },
  "packDensity": {
    "base": "Circle",
    "keys": []
  },
  "type": "StarcoreArcs"
}, {children:[],mask:null})],mask:null})],mask:null})
};}
