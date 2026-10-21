// Explanations use evaluated values so keyed dependencies follow the playhead.
export function parameterState(original,evaluated,path,mode='normal'){
 const track=original.tracks?.[path],active=!!track&&!track.muted&&original.animationEnabled!==false;
 let dependency='';
 if(path==='contour.radius'&&evaluated.contour.mode==='none')dependency='当前不生效：轮廓方式为“关闭”，请先选择外描边、膨胀或收缩。';
 if(path==='uv.5'&&evaluated.uv[4]===0)dependency='当前不生效：UV滚动速度为0，先调整滚动速度。';
 if(path==='shapeClock.speed'&&evaluated.shapeClock.speed===0)dependency='运动速度为0，图形内置动画已暂停。';
 if(evaluated.type==='TurbulentFlame'&&/^params\.(15|16|17)$/.test(path)&&evaluated.params[13]===0)dependency='当前不生效：烟气混合为0，先提高“烟气混合”。';
 else if(evaluated.type==='TurbulentFlame'&&/^params\.(13|16|17)$/.test(path)&&evaluated.params[15]===0)dependency='当前不生效：烟气密度为0，先提高“烟气密度”。';
 return {locked:active&&mode==='normal',animation:active?(mode==='record'?'录制中':mode==='base'?'编辑基础值':'动画控制中'):'',dependency};
}
