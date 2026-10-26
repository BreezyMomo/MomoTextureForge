import {messageError} from './message-catalog.js';
import {onLanguageChange} from './language.js';
import {uiText,uiFormat} from './ui-language.js';
import {TreeRenderer} from './tree-renderer.js';
import {MATERIAL_DEFAULTS} from './editor-preferences.js';
const VS=`#version 300 es
out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0,1);}`;
const FS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D albedoTex,normalTex,heightTex;
uniform vec2 orbit;uniform float aspect,lightAngle,ambientIntensity,lightIntensity,roughness,metallic,tiling;uniform int model,previewChannel;
vec3 rotateView(vec3 p){float a=orbit.x,b=orbit.y;p=mat3(1,0,0,0,cos(b),sin(b),0,-sin(b),cos(b))*p;return mat3(cos(a),0,-sin(a),0,1,0,sin(a),0,cos(a))*p;}
void main(){
 vec2 q=(uv*2.-1.)*vec2(aspect,1.);vec3 ro=rotateView(vec3(0,0,3)),rd=rotateView(normalize(vec3(q,-1.8))),p,n,tangent,bitangent;float hit=-1.;vec2 st;
 if(model==0){float b=dot(ro,rd),c=dot(ro,ro)-.81,d=b*b-c;if(d>=0.)hit=-b-sqrt(d);if(hit>0.){p=ro+rd*hit;n=normalize(p);st=vec2(atan(n.x,n.z)/6.283185+.5,asin(n.y)/3.141593+.5);tangent=normalize(vec3(n.z,0,-n.x)+vec3(.00001,0,0));bitangent=cross(n,tangent);}}
 else if(model==1){if(abs(rd.z)>.0001){hit=-ro.z/rd.z;p=ro+rd*hit;if(max(abs(p.x),abs(p.y))>.9)hit=-1.;n=vec3(0,0,ro.z>0.?1.:-1.);st=p.xy/1.8+.5;tangent=vec3(1,0,0);bitangent=vec3(0,1,0);}}
 else{vec3 inv=1./(rd+vec3(.000001)),a=(-vec3(.7)-ro)*inv,b=(vec3(.7)-ro)*inv,lo=min(a,b),hi=max(a,b);float near=max(lo.x,max(lo.y,lo.z)),far=min(hi.x,min(hi.y,hi.z));if(far>=near&&near>0.){hit=near;p=ro+rd*hit;// Select one face without nested branches; the D3D11 shader backend can fail to draw the branch version.
 vec3 axis=abs(p),side=sign(p);float faceX=step(axis.y,axis.x)*step(axis.z,axis.x),faceY=(1.-faceX)*step(axis.z,axis.y),faceZ=1.-faceX-faceY;
 n=vec3(faceX,faceY,faceZ)*side;
 st=(vec2(-p.z*side.x,p.y)*faceX+vec2(p.x,-p.z*side.y)*faceY+vec2(p.x*side.z,p.y)*faceZ)/1.4+.5;
 tangent=vec3(faceY+faceZ*side.z,0,-faceX*side.x);bitangent=vec3(0,faceX+faceZ,-faceY*side.y);}}
 vec3 background=mix(vec3(.06,.075,.10),vec3(.18,.20,.25),uv.y);
 if(hit<0.){frag=vec4(background,1);return;}
 st=fract(st*tiling);
 vec4 color=texture(albedoTex,st);vec3 base=mix(vec3(.16),color.rgb,color.a),map=texture(normalTex,st).rgb*2.-1.;
 if(previewChannel==1)base=vec3(texture(heightTex,st).r);
 if(previewChannel==2){base=vec3(.55);n=normalize(tangent*map.x+bitangent*map.y+n*map.z);}
 vec3 light=normalize(vec3(cos(lightAngle),.8,sin(lightAngle))),view=normalize(ro-p),halfway=normalize(light+view);
 float diffuse=max(0.,dot(n,light)),spec=pow(max(0.,dot(n,halfway)),mix(128.,4.,roughness))*(1.-roughness*.7);
 vec3 result=base*ambientIntensity+(base*diffuse*(1.-metallic)*.9+mix(vec3(.28),base,metallic)*spec)*lightIntensity;
 frag=vec4(pow(max(result,vec3(0)),vec3(1./2.2)),1.);
}`;
// The caller supplies the current preview project and clock; view controls never change exported data.
export function createMaterialPreview(host,{controls,onError=()=>{},onStatus=()=>{}}={}){
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',uiText("material.dMaterialView"));canvas.className='material-preview-canvas';host.append(canvas);
 const bar=controls??document.createElement('div');if(!controls)host.prepend(bar);bar.classList.add('material-controls');
 const {orbit:initialOrbit,...initialSettings}=MATERIAL_DEFAULTS;
 const gl=canvas.getContext('webgl2'),textures=[],shaders=[],values={...initialSettings,previewChannel:0};
 let languageDispose=()=>{};const labels=[];let modelChoice;
 let disposed=false,program=null,vao=null,ownedRenderer=null,orbit=[...initialOrbit],pointer=null,sampled=false;
 const check=stage=>{const error=gl.getError();if(error)throw messageError("errors.materialPreviewFailedWebGL", stage, error);};
 const loc=name=>gl.getUniformLocation(program,name);
 const draw=(dimensions)=>{
  if(disposed||!sampled)return;
  const bounds=host.getBoundingClientRect(),scale=Math.min(window.devicePixelRatio||1,2),width=dimensions?.width??Math.max(1,Math.round(bounds.width*scale)),height=dimensions?.height??Math.max(1,Math.round(bounds.height*scale));
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  gl.useProgram(program);gl.bindVertexArray(vao);gl.viewport(0,0,width,height);
  textures.forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc(['albedoTex','normalTex','heightTex'][i]),i);});
  gl.uniform2fv(loc('orbit'),orbit);gl.uniform1f(loc('aspect'),width/height);
  for(const [name,value]of Object.entries(values))if(name==='model'||name==='previewChannel')gl.uniform1i(loc(name),value);else gl.uniform1f(loc(name),value);
  check(uiText("material.parameterBinding"));gl.drawArrays(gl.TRIANGLES,0,3);check(uiText("material.draw"));
 };
 const redraw=()=>{try{draw();}catch(error){onError(error.message);}};
 const destroy=()=>{if(disposed)return;disposed=true;languageDispose();ownedRenderer?.destroy();for(const t of textures)gl?.deleteTexture(t);for(const s of shaders)gl?.deleteShader(s);if(program)gl.deleteProgram(program);if(vao)gl.deleteVertexArray(vao);gl?.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove();bar.replaceChildren();if(!controls)bar.remove();};
 try{
  if(!gl)throw messageError("material.webgl2IsUnavailableOnThisDevice");
  const compile=(code,kind)=>{const shader=gl.createShader(kind);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
  const v=compile(VS,gl.VERTEX_SHADER),f=compile(FS,gl.FRAGMENT_SHADER);program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));vao=gl.createVertexArray();
  for(let i=0;i<3;i++){
   const texture=gl.createTexture();textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  }
  check(uiText("material.initialization"));
  const choice=modelChoice=document.createElement('select');choice.setAttribute('aria-label',uiText("material.previewMesh"));["material.sphere","material.plane","material.cube"].forEach((text,i)=>choice.add(new Option(uiText(text),i)));choice.onchange=()=>{values.model=+choice.value;redraw();};bar.append(choice);
  for(const [key,label,min,max,step]of [['lightAngle',"material.lightDirection",-3.14,3.14,.01],['lightIntensity',"material.lightIntensity",0,3,.01],['ambientIntensity',"material.ambientIntensity",0,2,.01],['roughness',"material.roughness",0,1,.01],['metallic',"material.metallic",0,1,.01],['tiling',"material.textureRepeat",1,4,1]]){
   const l=document.createElement('label');l.textContent=uiText(label);const input=document.createElement('input');Object.assign(input,{type:'range',min,max,step,value:values[key]});input.setAttribute('aria-label',uiText(label));l.append(input);
   let output;if(key==='lightIntensity'||key==='ambientIntensity'){output=document.createElement('output');output.className='material-control-value';output.textContent=values[key].toFixed(2);l.append(output);}
   input.oninput=()=>{values[key]=+input.value;if(output)output.textContent=values[key].toFixed(2);redraw();};bar.append(l);labels.push({row:l,input,output,label,key});
  }
  const reset=document.createElement('button');reset.textContent=uiText("material.resetView");reset.onclick=()=>{orbit=[.35,-.2];redraw();};bar.append(reset);languageDispose=onLanguageChange(()=>{canvas.setAttribute('aria-label',uiText("material.dMaterialView"));choice.setAttribute('aria-label',uiText("material.previewMesh"));["material.sphere","material.plane","material.cube"].forEach((text,i)=>choice.options[i].text=uiText(text));for(const {row,input,label}of labels){row.firstChild.nodeValue=uiText(label);input.setAttribute('aria-label',uiText(label));}reset.textContent=uiText("material.resetView");});
  canvas.onpointerdown=e=>{if(e.button!==0)return;pointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!pointer)return;orbit=[orbit[0]+(e.clientX-pointer[0])*.01,Math.max(-1.4,Math.min(1.4,orbit[1]+(e.clientY-pointer[1])*.01))];pointer=[e.clientX,e.clientY];redraw();};
  canvas.onpointerup=canvas.onpointercancel=e=>{pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed)onError('三维预览图形上下文丢失，请重试预览');});
 }catch(error){destroy();throw error;}
 return {
  state:()=>{const {previewChannel,...settings}=values;return {...settings,orbit:[...orbit]};},
  capture(size=512){if(!sampled||disposed)throw Error('Material preview has no rendered frame');draw({width:size,height:size});const result={width:canvas.width,height:canvas.height,data:canvas.toDataURL('image/png').split(',')[1]};draw();return result;},
  configure(changes){
   const {orbit:nextOrbit,resetView,...next}=changes;Object.assign(values,next);
   if(resetView)orbit=[.35,-.2];if(nextOrbit)orbit=[...nextOrbit];
   modelChoice.value=String(values.model);for(const {input,output,key}of labels){input.value=String(values[key]);if(output)output.textContent=values[key].toFixed(2);}redraw();
  },
  update(project,{time=0,formulaSeconds=time*project.output.seconds,solo=null,quick=false,renderer}={}){
   if(disposed)return;
   values.previewChannel=['color','height','normal','rgba'].indexOf(project.output.mode);
   const p={...project,output:{...project.output,alpha:true}},long=quick?192:384,w=Math.max(1,Math.round(long*Math.min(1,p.canvas.ratio))),h=Math.max(1,Math.round(long/Math.max(1,p.canvas.ratio)));
   const source=renderer??(ownedRenderer??=new TreeRenderer(document.createElement('canvas')));
   for(const [i,mode]of [project.output.mode==='rgba'?'rgba':'color','normal','height'].entries()){
    p.output.mode=mode;const data=source.draw(p,w,h,{time,formulaSeconds,solo,read:true,quality:1}),bytes=new Uint8Array(data.length);
    for(let y=0;y<h;y++)for(let x=0;x<w*4;x++)bytes[y*w*4+x]=Math.round(Math.max(0,Math.min(1,data[(h-y-1)*w*4+x]))*255);
    gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
   }
   check(uiText("material.materialSampling"));sampled=true;draw();onStatus(uiFormat("material.dMaterialValueValueSamplesDragToOrbit",w,h));
  },destroy
 };
}
