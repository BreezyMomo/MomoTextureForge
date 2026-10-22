import {messageError} from './message-catalog.js';
import {uiText} from './ui-language.js';
import {decodeZIP} from './resource-zip.js';

export function graphicTypeLabel(kind,mime){
 if(kind==='image')return uiText(mime==='image/svg+xml'?"ui.vectorImageSVG":['image/png','image/jpeg','image/webp'].includes(mime)?"ui.bitmap":"ui.imageUnknownType");
 return uiText({formula:"editor.formula",composition:"common.group"}[kind]??"editor.formula");
}

// Read the saved root descriptor without registering assets or decoding images.
export async function imageTypeFromBundle(bytes){
 const files=await decodeZIP(bytes),decoder=new TextDecoder('utf-8',{fatal:true});
 const json=path=>{const value=files.get(path);if(!value)throw messageError("ui.missingResourceDescription");return JSON.parse(decoder.decode(value));};
 const manifest=json('manifest.json'),content=json(manifest.content);
 const record=manifest.assets?.find(item=>item.id===content.root?.type);
 if(!record)return graphicTypeLabel('image');
 const asset=json(record.file);
 return graphicTypeLabel('image',asset.kind==='image'?asset.mime:undefined);
}
