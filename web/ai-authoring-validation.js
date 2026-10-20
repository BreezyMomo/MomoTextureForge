import {CATALOG} from './catalog.js';
import {builtinAsset,registerAsset,unregisterAsset,contentHash} from './resource-assets.js';
import {authoringFromEditor,assetFromAuthoring,scalarHelpers,AUTHORING_EXAMPLE} from './ai-authoring.js';
import {TreeRenderer} from './tree-renderer.js';
import {node,project} from './tree-model.js';
const button=document.querySelector('#run'),output=document.querySelector('#result');
button.onclick=async()=>{button.disabled=true;const results=[],canvas=document.createElement('canvas');
 for(const entry of [...CATALOG].filter(p=>!p.id.startsWith('asset_'))){let renderer;const ids=[];try{
  const asset=builtinAsset(entry.id),source=asset.definition.outputs.scalar,params=asset.definition.parameters.map(p=>({...p,variable:p.variable??p.key}));
  const draft=authoringFromEditor(asset,{name:entry.zh,category:entry.categoryName,description:''},source.inline,source.kind,params,scalarHelpers(asset));
  delete asset.definition.outputs.vector;asset.definition.seamless={kind:'blend'};
  renderer=new TreeRenderer(canvas);const p=project();let id='asset_'+await contentHash(asset);registerAsset(id,asset);ids.push(id);p.root.children=[node('shape',id)];const original=renderer.draw(p,32,32,{time:.35,formulaSeconds:1,read:true}).slice();
  const converted=assetFromAuthoring(draft);id='asset_'+await contentHash(converted);registerAsset(id,converted);ids.push(id);p.root.children=[node('shape',id)];
  const actual=renderer.draw(p,32,32,{time:.35,formulaSeconds:1,read:true});let delta=0;for(let i=0;i<actual.length;i++)delta=Math.max(delta,Math.abs(actual[i]-original[i]));results.push({id:entry.id,delta,status:delta===0?'PASS':'DIFF'});
 }catch(e){results.push({id:entry.id,status:'FAIL',error:e.message});}finally{renderer?.destroy();for(const id of ids.reverse())unregisterAsset(id);}
 output.textContent=JSON.stringify({status:'RUNNING',count:results.length,last:results.at(-1)},null,2);await new Promise(r=>setTimeout(r,0));
 }
 let renderer,id;try{const a=assetFromAuthoring(AUTHORING_EXAMPLE);id='asset_'+await contentHash(a);registerAsset(id,a);renderer=new TreeRenderer(canvas);const p=project();p.root.children=[node('shape',id)];const frames=[0,.25,.5,1,2].map(t=>renderer.draw(p,64,64,{formulaSeconds:t,read:true}).slice());if(frames[0].every((v,i)=>v===frames[1][i]))throw Error('示例动画没有变化');results.push({id:'example-animation',status:'PASS'});}catch(e){results.push({id:'example-animation',status:'FAIL',error:e.message});}finally{renderer?.destroy();if(id)unregisterAsset(id);}
 output.textContent=JSON.stringify({status:results.every(r=>r.status==='PASS')?'PASS':'FAIL',count:results.length,results},null,2);button.disabled=false;
};
