import {uiText} from './ui-language.js';
// Explanations use evaluated values so keyed dependencies follow the playhead.
export function parameterState(original,evaluated,path,mode='normal'){
 const track=original.tracks?.[path],active=!!track&&!track.muted&&original.animationEnabled!==false;
 let dependency='';
 if(path==='contour.radius'&&evaluated.contour.mode==='none')dependency="parameter.inactiveContourModeIsNoneChooseOutlineDilateOrErodeFirst";
 if(path==='uv.5'&&evaluated.uv[4]===0)dependency="parameter.inactiveUVScrollSpeedIsIncreaseTheScrollSpeedFirst";
 if(path==='shapeClock.speed'&&evaluated.shapeClock.speed===0)dependency="parameter.motionSpeedIsBuiltInShapeAnimationIsPaused";
 if(evaluated.type==='TurbulentFlame'&&/^params\.(15|16|17)$/.test(path)&&evaluated.params[13]===0)dependency="parameter.inactiveSmokeBlendIsIncreaseSmokeBlendFirst";
 else if(evaluated.type==='TurbulentFlame'&&/^params\.(13|16|17)$/.test(path)&&evaluated.params[15]===0)dependency="parameter.inactiveSmokeDensityIsIncreaseSmokeDensityFirst";
 return {locked:active&&mode==='normal',animation:active?uiText(mode==='record'?"parameter.recording":mode==='base'?"editor.editBaseValue":"parameter.animated"):'',dependency:uiText(dependency)};
}
