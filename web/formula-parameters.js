// Bind in an outer lexical scope rather than rewriting identifiers in authored GLSL.
const reserved=new Set('u q r time a b c d float int uint bool true false return if else for while do break continue const void vec2 vec3 vec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 bvec2 bvec3 bvec4 mat2 mat3 mat4 uniform in out inout gl_Position gl_FragCoord'.split(' '));
const type=/^(?:float|int|uint|bool|[biu]?vec[234]|mat[234](?:x[234])?)$/;
const lex=source=>[...source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,' ').matchAll(/[A-Za-z_][A-Za-z0-9_]*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[^\s]/g)].map(m=>m[0]);
export function bindFormulaParameters(source,parameters,kind='expression',additionalSlots=[]){
 const names=new Map(),used=new Set(),slots=new Map();
 for(const p of parameters){const name=p.variable;
  if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)||name.startsWith('gl_')||name.includes('__')||reserved.has(name))throw Error('无效或保留的公式变量：'+name);
  if(names.has(name))throw Error('公式变量重复：'+name);
  if(!Number.isInteger(p.slot)||p.slot<0||p.slot>15||slots.has(p.slot))throw Error('参数槽无效或重复');
  names.set(name,p);slots.set(p.slot,name);
 }
 for(const slot of additionalSlots){const name=slots.get(slot);if(name)used.add(name);}
 const tokens=lex(source),scopes=[new Set()];let depth=0,decl=null;
 const local=name=>scopes.some(s=>s.has(name));
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i],next=tokens[i+1],previous=tokens[i-1];
  if(token==='{'){scopes.push(new Set());decl=null;continue;}
  if(token==='}'){if(scopes.length>1)scopes.pop();decl=null;continue;}
  if(token==='('||token==='['){depth++;continue;}
  if(token===')'||token===']'){depth--;if(decl&&depth<decl.depth)decl=null;continue;}
  if(token===';'){decl=null;continue;}
  if(type.test(token)&&/^[A-Za-z_]\w*$/.test(next??'')){decl={depth,expect:true};continue;}
  if(token===','&&decl&&decl.depth===depth){decl.expect=true;continue;}
  if(decl?.expect&&/^[A-Za-z_]\w*$/.test(token)){scopes.at(-1).add(token);decl.expect=false;continue;}
  if(previous==='.'||local(token))continue;
  if(names.has(token)){if(next==='(')throw Error('参数名与函数冲突：'+token);used.add(token);}
  // Original builtins frequently read a.xyzw / b.xyzw instead of R/W/N/S/D/K.
  if(/^[abcd]$/.test(token)&&next==='.'&&/^[xyzwrgba]{1,4}$/.test(tokens[i+2]??'')){
   for(const component of tokens[i+2]){const index='xyzw'.includes(component)?'xyzw'.indexOf(component):'rgba'.indexOf(component),name=slots.get('abcd'.indexOf(token)*4+index);if(name)used.add(name);}
  }else if(/^[abcd]$/.test(token)&&next!=='.'){for(let component=0;component<4;component++){const name=slots.get('abcd'.indexOf(token)*4+component);if(name)used.add(name);}}
 }
 const bindings=parameters.map(p=>'float '+p.variable+' = '+'abcd'[Math.floor(p.slot/4)]+'.'+'xyzw'[p.slot%4]+';').join('\n');
 return {kind:'body',compiled:'{\n'+bindings+'\n{\n'+(kind==='expression'?'return (\n'+source+'\n);':source)+'\n}\n}',unused:parameters.filter(p=>!used.has(p.variable)).map(p=>p.variable)};
}

// The original vector output may consume parameters outside its scalar formula.
export function vectorParameterSlots(definition,libraries){
 if(!definition.outputs.vector)return [];
 const source=libraries[definition.outputs.vector.library]??'',marker='if(id=={{id:'+definition.id+'}})',start=source.indexOf(marker);
 if(start<0)return [];
 const tail=source.slice(start+marker.length),end=tail.search(/\n(?:if\(|return vec3)/),branch=end<0?tail:tail.slice(0,end),slots=new Set();
 for(const match of branch.matchAll(/params\[(\d+)\](?:\.([xyzwrgba]+))?/g)){const base=+match[1]*4;for(const c of match[2]??'xyzw')slots.add(base+('xyzw'.includes(c)?'xyzw'.indexOf(c):'rgba'.indexOf(c)));}
 return [...slots];
}
