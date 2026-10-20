import {CATALOG} from './catalog.js';
import {builtinAsset,registerAsset,unregisterAsset,contentHash} from './resource-assets.js';
import {bindFormulaParameters,vectorParameterSlots} from './formula-parameters.js';
import {TreeRenderer} from './tree-renderer.js';
import {node,project} from './tree-model.js';
const button=document.querySelector('#run'),output=document.querySelector('#result');
button.onclick=async()=>{button.disabled=true;const results=[],canvas=document.createElement('canvas');
 for(const entry of [...CATALOG].filter(p=>!p.id.startsWith('asset_'))){let renderer,id,registered=false;try{
  const asset=builtinAsset(entry.id),source=asset.definition.outputs.scalar,params=asset.definition.parameters.map(p=>({...p,variable:p.key}));
  const binding=bindFormulaParameters(source.inline,params,source.kind,vectorParameterSlots(asset.definition,asset.libraries));
  renderer=new TreeRenderer(canvas);const p=project();p.root.children=[node('shape',entry.id)];const original=renderer.draw(p,32,32,{time:.35,formulaSeconds:1,read:true}).slice();
  asset.definition.outputs.scalar={...source,kind:binding.kind,inline:binding.compiled};asset.definition.parameters=params;
  id='asset_'+await contentHash(asset);registerAsset(id,asset);registered=true;p.root.children=[node('shape',id)];
  const actual=renderer.draw(p,32,32,{time:.35,formulaSeconds:1,read:true});let delta=0;for(let i=0;i<actual.length;i++)delta=Math.max(delta,Math.abs(actual[i]-original[i]));
  results.push({id:entry.id,delta,unused:binding.unused,status:delta===0?'PASS':'DIFF'});
 }catch(e){results.push({id:entry.id,status:'FAIL',error:e.message});}finally{renderer?.destroy();if(registered)unregisterAsset(id);}
 output.textContent=JSON.stringify({status:'RUNNING',count:results.length,last:results.at(-1)},null,2);await new Promise(r=>setTimeout(r,0));
 }
 output.textContent=JSON.stringify({status:results.every(r=>r.status==='PASS')?'PASS':'FAIL',count:results.length,results},null,2);button.disabled=false;
};
