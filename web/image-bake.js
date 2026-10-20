import {prepareImageBitmap,imageSamplingGLSL} from './image-processing.js';

export function needsImageBake(asset){
 if(asset.kind!=='image'||asset.mime==='image/svg+xml')return false;
 const p=asset.imageProcessing,t=asset.imageTransform,c=asset.imageColor;
 return !!(p&&(p.mode!=='none'||p.autoCenter||p.contour?.enabled)||t&&(t.scale!==1||t.rotation!==0)||c&&c.mode!=='none');
}
const bytes64=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
// Confirmation uses native image dimensions, never the editor's small preview.
export async function finalizeImageAsset(asset){
 if(asset.kind!=='image'||asset.mime==='image/svg+xml')return asset;
 const bake=needsImageBake(asset);
 if(!bake&&!asset.imageProcessing&&!asset.imageTransform&&!asset.imageColor)return asset;
 const result=structuredClone(asset);
 if(bake){
  let bitmap,gl,program,texture;const shaders=[];
  try{
   bitmap=await prepareImageBitmap(asset);
   const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);
   gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
   if(!gl)throw Error('保存处理结果需要WebGL2，请开启图形加速');
   if(Math.max(bitmap.width,bitmap.height)>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('图片尺寸超过显卡限制');
   const compile=(type,source)=>{const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('图片结果编译失败：'+gl.getShaderInfoLog(shader));return shader;};
   program=gl.createProgram();
   gl.attachShader(program,compile(gl.VERTEX_SHADER,'#version 300 es\nout vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}'));
   gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;in vec2 uv;out vec4 color;uniform sampler2D assetImage;\n'+imageSamplingGLSL(asset.imageProcessing,asset.imageTransform,asset.imageColor)+'\nvoid main(){color=sampleAssetImage(uv);if(color.a<=0.)color.rgb=vec3(0);}'));
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('图片结果链接失败：'+gl.getProgramInfoLog(program));
   gl.useProgram(program);texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
   for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(gl.getUniformLocation(program,'assetImage'),0);
   gl.viewport(0,0,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,3);
   if(gl.getError()||gl.isContextLost())throw Error('图片结果生成失败，请重试');
   const blob=await canvas.convertToBlob({type:'image/png'});
   if(gl.isContextLost())throw Error('图片结果生成时图形上下文丢失');
   const bytes=new Uint8Array(await blob.arrayBuffer());
   if(bytes.length>16*1024*1024)throw Error('处理后的PNG超过16MB，请先缩小图片再保存');
   result.mime='image/png';result.data=bytes64(bytes);
  }finally{bitmap?.close();if(gl){if(texture)gl.deleteTexture(texture);if(program)gl.deleteProgram(program);for(const s of shaders)gl.deleteShader(s);gl.getExtension('WEBGL_lose_context')?.loseContext();}}
 }
 delete result.imageProcessing;delete result.imageTransform;delete result.imageColor;
 return result;
}
