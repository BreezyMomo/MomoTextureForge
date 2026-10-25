import {RETIRED_HANDDRAWN_MESSAGE} from './handdrawn-contract.js';
import {SHADER_VERTEX,shaderFragment,sanitizeShaderParameters,shaderColor} from './shader-reference.js';
import {messageError} from './message-catalog.js';
export class ShaderReferenceRenderer{
 constructor(canvas){
  throw Error(RETIRED_HANDDRAWN_MESSAGE);
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!this.gl)throw messageError('shader.webglRequired');const gl=this.gl,shaders=[];
  try{
   const compile=(kind,source)=>{const s=gl.createShader(kind);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw messageError('shader.compileFailed',gl.getShaderInfoLog(s));return s;};
   this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,SHADER_VERTEX));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,shaderFragment()));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw messageError('shader.compileFailed',gl.getProgramInfoLog(this.program));
   this.texture=gl.createTexture();this.strokeTexture=gl.createTexture();this.vao=gl.createVertexArray();this.locations=new Map();this.setStroke(null);
  }catch(e){this.dispose();throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
 }
 setMask(image){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);this.width=image.width;this.height=image.height;}
 setStroke(image,{color='#202020',opacity=1,nodeOpacity=1}={}){const gl=this.gl;this.stroke=image?{color,opacity,nodeOpacity}:null;gl.bindTexture(gl.TEXTURE_2D,this.strokeTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);if(image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);}
 draw(raw,time=0,size=512){
  const v=sanitizeShaderParameters(raw),gl=this.gl,aspect=this.width/this.height;
  this.canvas.width=aspect>=1?size:Math.max(1,Math.round(size*aspect));this.canvas.height=aspect>=1?Math.max(1,Math.round(size/aspect)):size;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  const loc=key=>{if(!this.locations.has(key))this.locations.set(key,gl.getUniformLocation(this.program,key));return this.locations.get(key);};
  for(const key of ['style','gap','width','angle','roughness','seed','dashLength','dashGap','inkOpacity','paperOpacity'])gl.uniform1f(loc(key),v[key]);
  gl.uniform1i(loc('maskTex'),0);gl.uniform1f(loc('timeSeconds'),time);gl.uniform2f(loc('scroll'),v.scrollX,v.scrollY);
  const scale=512/Math.min(this.width,this.height);gl.uniform2f(loc('designSize'),this.width*scale,this.height*scale);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.strokeTexture);gl.uniform1i(loc('strokeTex'),1);gl.uniform1f(loc('strokeEnabled'),this.stroke?1:0);gl.uniform1f(loc('strokeOpacity'),this.stroke?.opacity??1);gl.uniform1f(loc('nodeOpacity'),this.stroke?.nodeOpacity??1);gl.uniform3fv(loc('strokeColor'),shaderColor(this.stroke?.color??'#202020'));
  gl.uniform3fv(loc('inkColor'),shaderColor(v.inkColor));gl.uniform3fv(loc('paperColor'),shaderColor(v.paperColor));gl.drawArrays(gl.TRIANGLES,0,3);
  if(gl.getError())throw messageError('shader.renderFailed');return this.canvas;
 }
 dispose(){const gl=this.gl;if(!gl)return;if(this.texture)gl.deleteTexture(this.texture);if(this.strokeTexture)gl.deleteTexture(this.strokeTexture);if(this.vao)gl.deleteVertexArray(this.vao);if(this.program)gl.deleteProgram(this.program);}
}
