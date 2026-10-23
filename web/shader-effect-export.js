import {TreeRenderer} from './tree-renderer.js';
import {find,nodeClock} from './tree-model.js';
import {effectValues,effectOrder} from './post-effect-specs.js';
import {previewDimensions} from './tree-view.js';
import {sketchContours} from './sketch-contours.js';
import {sketchShaderParameters,shaderReferencePackage} from './shader-reference.js';
import {ShaderReferenceRenderer} from './shader-reference-renderer.js';
import {messageError} from './message-catalog.js';

const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(async blob=>blob?resolve(new Uint8Array(await blob.arrayBuffer())):reject(messageError('shader.imageFailed')),'image/png'));
function imageCanvas(pixels,width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height);
 for(let i=0;i<pixels.length;i++)image.data[i]=Math.round(Math.max(0,Math.min(1,pixels[i]))*255);ctx.putImageData(image,0,0);return canvas;
}
// Package a frozen effect snapshot, never an editable node/project context.
export async function exportSketchShaderReference({project,nodeId,time=0,formulaSeconds=0}){
 const source=structuredClone(project),selected=find(source.root,nodeId)?.node,clock=nodeClock(source.root,nodeId,time);
 if(!selected||!clock)throw messageError('ui.nodeNotFound');
 const values=effectValues(clock.node,'sketch'),parameters=sketchShaderParameters(values),{width,height}=previewDimensions(source.canvas.ratio,512,512);
 source.output={...source.output,mode:'color',alpha:true};
 const capture=new TreeRenderer(document.createElement('canvas'));let previewRenderer;
 try{
  previewRenderer=new ShaderReferenceRenderer(document.createElement('canvas'));
  const editor=imageCanvas(capture.draw(source,width,height,{time,formulaSeconds,solo:nodeId,read:true}),width,height);
  // Capture content entering this effect. Child effects remain intact; later effects on this node are skipped.
  const order=effectOrder(selected.effectOrder);for(const id of order.slice(order.indexOf('sketch'))){selected.postEffects[id].enabled=false;delete selected.tracks['postEffects.'+id+'.enabled'];}
  const topDown=capture.draw(source,width,height,{time,formulaSeconds,solo:nodeId,read:true}),bottomUp=new Float32Array(topDown.length);
  for(let y=0;y<height;y++)bottomUp.set(topDown.subarray(y*width*4,(y+1)*width*4),(height-y-1)*width*4);
  const outline=sketchContours(bottomUp,width,height,{...values,aspect:source.canvas.ratio}),mask=document.createElement('canvas');mask.width=width;mask.height=height;
  const ctx=mask.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.scale(width/outline.baseWidth,height/outline.baseHeight);ctx.fillStyle='#fff';if(outline.path)ctx.fill(new Path2D(outline.path),'evenodd');
  previewRenderer.setMask(mask);const reference=previewRenderer.draw(parameters,0);
  const [maskBytes,previewBytes,editorBytes]=await Promise.all([png(mask),png(reference),png(editor)]);
  return shaderReferencePackage({parameters,width,height,mask:maskBytes,preview:previewBytes,editorPreview:editorBytes,sourceEffect:{
   id:'sketch',values,frameProgress:time,formulaSeconds,conversion:'approximate-fill-only',
   mapping:{style:'1→0, 2→1, 3→2, 6→3, 7→4, 8→5',gap:'hatchGap',width:'hatchWidth (dot radius in shader)',angle:'hatchAngle',roughness:'roughness / 10',seed:'seed',inkColor:'fillColor',inkOpacity:'fillOpacity',dashLength:'dashLength',dashGap:'dashGap'},
   limitations:['Reference parameters are bounded to the documented shader ranges; original values are retained here.','Rough.js stroke geometry, outlines, multi-strokes and advanced fill options are not reproduced.','Mask is a static contour snapshot in canvas coordinates; transforms and animation are baked into it.','editor-preview.png shows the node in the editor; reference-preview.png shows only the reference shader.']
  }});
 }finally{capture.destroy();previewRenderer?.dispose();}
}
