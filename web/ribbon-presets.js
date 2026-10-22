export const RIBBON_PRESETS=[
 {id:'silk',name:'月白薄纱',aliases:{'zh-CN':'月白薄纱',en:'Moonlit silk'},color:'#e1edff',values:{strandCount:640,strandOpacity:.065,foldAmount:.38,bandWidth:.48,noiseStrength:.035,detailStrength:.003,softGlow:.7}},
 {id:'energy',name:'青蓝流光',aliases:{'zh-CN':'青蓝流光',en:'Cyan energy'},color:'#73ddff',values:{strandCount:320,strandWidth:.0018,strandOpacity:.16,foldAmount:.85,noiseStrength:.065,detailStrength:.008,exposure:2.6,softGlow:1.2,motionSpeed:.65}},
 {id:'smoke',name:'游离烟丝',aliases:{'zh-CN':'游离烟丝',en:'Drifting wisps'},color:'#cbd8ed',values:{strandCount:200,strandWidth:.002,strandOpacity:.07,foldAmount:.22,waveAmplitude:.1,noiseStrength:.1,noiseFrequency:2.5,detailStrength:.009,softGlow:1.8,motionSpeed:.2}}
];
export const MEMBRANE_PRESETS=[
 {id:'ice',name:'冰蓝薄膜',aliases:{'zh-CN':'冰蓝薄膜',en:'Ice blue membrane'},native:true,values:{}},
 {id:'iridescent',name:'紫金折光',aliases:{'zh-CN':'紫金折光',en:'Violet gold sheen'},native:true,values:{baseTint:0xbda2de,edgeTint:0xffcb72,foldAmount:.8,bandWidth:.48,exposure:1.8,interiorOpacity:.06,softGlow:.6}},
 {id:'veil',name:'月白轻纱',aliases:{'zh-CN':'月白轻纱',en:'Moonlit veil'},native:true,values:{baseTint:0xffffff,edgeTint:0xd8ecff,interiorOpacity:.025,creaseBrightness:.08,edgeBrightness:.32,waveAmplitude:.09,softGlow:.9}}
];
export const STRAND_PRESETS=[
 {id:'fine',name:'柔白细丝',aliases:{'zh-CN':'柔白细丝',en:'Soft white strands'},color:'#e3edff',values:{}},
 {id:'flow',name:'蓝色流丝',aliases:{'zh-CN':'蓝色流丝',en:'Blue flowing strands'},color:'#69dbff',values:{strandCount:220,strandWidth:.002,strandVariation:.85,noiseStrength:.045,noiseFrequency:3,motionSpeed:.8}},
 {id:'wisps',name:'烟尘游丝',aliases:{'zh-CN':'烟尘游丝',en:'Dusty wisps'},color:'#cbd5e4',values:{strandCount:180,strandWidth:.0022,strandVariation:.8,strandOpacity:.065,noiseStrength:.12,noiseFrequency:2,detailStrength:.004,softGlow:1.4,exposure:1.4}}
];
export const ribbonPresets=definition=>({membrane:MEMBRANE_PRESETS,strands:STRAND_PRESETS})[definition.generator?.style]??RIBBON_PRESETS;
export function ribbonPresetParameters(definition,preset){
 const values=[...definition.defaults];for(const spec of definition.parameters)if(Object.hasOwn(preset.values,spec.variable))values[spec.slot]=preset.values[spec.variable];return values;
}
