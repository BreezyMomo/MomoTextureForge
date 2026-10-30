import {readFile} from 'node:fs/promises';

// Source pages load the release snapshot through CSS imports. Offline builds
// inline the same files so a downloaded HTML never depends on the source tree.
export async function readEditorStyle(name){
 const file=new URL('../web/'+name,import.meta.url);
 const source=await readFile(file,'utf8');
 const imports=[...source.matchAll(/@import\s+['"](\.\/vendor\/momo-workbench\/[a-z-]+\.css)['"]\s*;/g)];
 let expanded=source;
 for(const match of imports){
  const shared=await readFile(new URL(match[1],file),'utf8');
  expanded=expanded.replace(match[0],()=>shared);
 }
 return expanded;
}
