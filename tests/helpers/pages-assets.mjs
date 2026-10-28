import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../site/assets/',import.meta.url));
const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
// Existing browser fixtures serve source files beside /built.html or /standalone.
// Serve hashed hosted assets from the same origin without changing those fixture routes.
export async function pagesAsset(url){
 const match=/\/assets\/([^/]+)$/.exec(new URL(url,'http://fixture.local').pathname);if(!match)return null;
 const file=resolve(root,decodeURIComponent(match[1]));if(!file.startsWith(resolve(root)+sep)||!types[extname(file)])throw Error('Invalid Pages asset');
 return {contentType:types[extname(file)],body:await readFile(file)};
}
export const withPagesAssets=handler=>async(request,response)=>{
 try{const asset=await pagesAsset(request.url);if(asset){response.setHeader('Content-Type',asset.contentType);response.end(asset.body);return;}}catch{response.writeHead(404).end();return;}
 return handler(request,response);
};
