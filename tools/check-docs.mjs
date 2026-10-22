import {readdir,readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const stripCode=text=>text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm,'');
export const headingSlug=text=>text.replace(/<[^>]*>/g,'').replace(/[`*]/g,'').trim().toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu,'').replaceAll(' ','-');
export async function documentationFiles(directory=root){
 const files=[];
 async function walk(folder){for(const entry of await readdir(path.join(directory,folder),{withFileTypes:true})){
  const name=path.posix.join(folder,entry.name);
  if(entry.isDirectory()&&!['node_modules','scripts','.git'].includes(entry.name))await walk(name);
  else if(entry.isFile()&&entry.name.endsWith('.md'))files.push(name);
 }}
 for(const entry of await readdir(directory,{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.md'))files.push(entry.name);
 for(const folder of ['docs','plans','skills'])await walk(folder);
 return files.sort();
}
export async function checkDocumentation(directory=root){
 const files=await documentationFiles(directory),texts=new Map(await Promise.all(files.map(async name=>[name,await readFile(path.join(directory,name),'utf8')]))),errors=[];
 let links=0,pairs=0;
 for(const name of files){
  const english=name.endsWith('.en.md'),text=texts.get(name),other=english?name.replace(/\.en\.md$/,'.md'):name.replace(/\.md$/,'.en.md');
  if(!texts.has(other))errors.push(name+': missing '+other);else if(!english)pairs++;
  const navigation=/<!-- doc-language -->\s*([\s\S]*?)<!-- \/doc-language -->/.exec(text);
  if(!navigation||!navigation[1].includes('('+path.posix.basename(other)+')'))errors.push(name+': missing language switch');
  const body=stripCode(text).replace(/<!-- doc-language -->[\s\S]*?<!-- \/doc-language -->/g,'');
  const urls=[...body.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
  urls.push(...[...body.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(m=>m[1]));
  for(let url of urls){
   if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)){
    if(english&&/^https:\/\/github\.com\/BreezyMomo\/MomoTextureForge\/blob\/main\/.*\.md(?:#|$)/.test(url)&&!url.split('#')[0].endsWith('.en.md'))errors.push(name+': English link opens Chinese '+url);
    continue;
   }
   url=url.replace(/^<|>$/g,'');const [target,fragment]=url.split('#');
   const relative=target?path.posix.normalize(path.posix.join(path.posix.dirname(name),decodeURIComponent(target))):name;
   if(relative.startsWith('../')||path.isAbsolute(relative)){errors.push(name+': path leaves repository '+url);continue;}
   links++;
   try{await access(path.join(directory,relative));}catch{errors.push(name+': missing link '+url);continue;}
   if(/^docs\/images\/.*\.png$/.test(relative)&&!relative.endsWith('/wechat-appreciation.png')){
    const englishImage=relative.startsWith('docs/images/en/');if(english!==englishImage)errors.push(name+': screenshot language differs from document '+url);
   }
   if(relative.endsWith('.md')){
    if(english!==relative.endsWith('.en.md'))errors.push(name+': cross-language body link '+url);
    if(fragment){const destination=stripCode(texts.get(relative)??await readFile(path.join(directory,relative),'utf8')),slugs=new Set(),counts=new Map();
     for(const match of destination.matchAll(/^#{1,6} (.+)$/gm)){const base=headingSlug(match[1]),count=counts.get(base)??0;counts.set(base,count+1);slugs.add(base+(count?'-'+count:''));}
     for(const match of destination.matchAll(/\bid="([^"]+)"/g))slugs.add(match[1]);
     if(!slugs.has(decodeURIComponent(fragment)))errors.push(name+': missing anchor '+url);
    }
   }
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {pairs,files:files.length,localLinks:links};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await checkDocumentation(),null,2));
