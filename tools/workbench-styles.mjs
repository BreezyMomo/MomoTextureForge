import {readFile} from 'node:fs/promises';

// Source pages load the release snapshot through CSS imports. Offline builds
// inline the same files so a downloaded HTML never depends on the source tree.
export async function readEditorStyle(name){
 async function expand(file,parents=new Set()){
  if(parents.has(file.href))throw new Error('Circular stylesheet import: '+file.href);
  const next=new Set([...parents,file.href]);
  let source=await readFile(file,'utf8');
  for(const match of [...source.matchAll(/@import\s+['"](\.\/[^'"]+\.css)['"]\s*;/g)]){
   const shared=await expand(new URL(match[1],file),next);
   source=source.replace(match[0],()=>shared);
  }
  return source;
 }
 return expand(new URL('../web/'+name,import.meta.url));
}
