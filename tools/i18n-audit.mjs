// Audit explicit message IDs, never infer IDs from display text.
import {parse} from 'acorn';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {UI_CATALOGS} from '../web/locales/catalogs.js';
import config from '../web/language-config.json' with {type:'json'};
export function visit(node,fn,parent=null){if(!node||typeof node!=='object')return;fn(node,parent);for(const [key,value]of Object.entries(node))if(key!=='parent'){if(Array.isArray(value))value.forEach(child=>visit(child,fn,node));else if(value&&typeof value==='object')visit(value,fn,node);}}
export async function collectMessages(){
 const found=new Map(),base=UI_CATALOGS[config.default],namespaces=new Set(Object.keys(base).map(key=>key.split('.')[0]));
 const add=(key,file)=>{if(!found.has(key))found.set(key,[]);if(!found.get(key).includes(file))found.get(key).push(file);};
 const markup=(source,file)=>{for(const match of source.matchAll(/data-i18n(?:-title|-aria-label|-placeholder|-alt)?=["']([^"']+)["']/g))add(match[1],file);};
 for(const name of [...await readdir(new URL('../web/',import.meta.url)),'../build-standalone.mjs']){
  if(!/\.(?:m?js|html)$/.test(name)||/vendor|kit-runtime/.test(name))continue;
  const source=await readFile(new URL('../web/'+name,import.meta.url),'utf8');markup(source,name);for(const match of source.matchAll(/uiText\(['"]([a-z][A-Za-z0-9.]*)['"]\)/g))add(match[1],name);
  if(/\.m?js$/.test(name))visit(parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=>{
   if(node.type==='Literal'&&typeof node.value==='string')markup(node.value,name);
   if(node.type==='Literal'&&typeof node.value==='string'&&/^[a-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/.test(node.value)&&namespaces.has(node.value.split('.')[0])&&!['animation.duration','animation.pingpong','canvas.ratio','library.json','examples.html'].includes(node.value))add(node.value,name);
   if(node.type==='CallExpression'&&['uiText','uiFormat','uiOption','messageError'].includes(node.callee.name))visit(node.arguments[0],arg=>{if(arg.type==='Literal'&&typeof arg.value==='string'&&/[\u3400-\u9fff]/.test(arg.value))throw Error('Display text used as a message key in '+name+': '+arg.value);});
  });
 }
 const builtin=JSON.parse(await readFile(new URL('../web/definitions/builtin.json',import.meta.url),'utf8'));
 for(const category of builtin.categories)add('categories.'+category.id+'.name','builtin categories');

 return found;
}
export async function validateUICatalogs(){
 const ids=Object.keys(UI_CATALOGS[config.default]).sort(),problems=[];
 for(const {code}of config.languages){const catalog=UI_CATALOGS[code];if(!catalog){problems.push('Missing catalog: '+code);continue;}
  if(JSON.stringify(Object.keys(catalog).sort())!==JSON.stringify(ids))problems.push('Message key set differs: '+code);
  for(const key of ids){if(!/^[a-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/.test(key))problems.push('Invalid message key: '+key);const text=catalog[key];if(typeof text!=='string'||!text.trim())problems.push('Empty message: '+code+' '+key);else if(JSON.stringify([...UI_CATALOGS[config.default][key].matchAll(/\{\d+\}/g)].map(m=>m[0]).sort())!==JSON.stringify([...text.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort()))problems.push('Placeholder mismatch: '+code+' '+key);}
 }
 const found=await collectMessages();for(const [key,files]of found)if(!Object.hasOwn(UI_CATALOGS[config.default],key))problems.push('Unknown key: '+key+' ('+files.join(', ')+')');
 if(problems.length)throw Error(problems.join('\n'));return {languages:config.languages.map(language=>language.code),messages:ids.length,referenced:found.size};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/i18n-audit.mjs')){try{console.log(JSON.stringify(await validateUICatalogs(),null,2));}catch(error){await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});await writeFile(new URL('../test-results/i18n-missing.json',import.meta.url),JSON.stringify({error:error.message},null,2));console.error(error.message);process.exitCode=1;}}
