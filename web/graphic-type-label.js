import {decodeZIP} from './resource-zip.js';

export function graphicTypeLabel(kind,mime){
 if(kind==='image')return mime==='image/svg+xml'?'矢量图（SVG）':['image/png','image/jpeg','image/webp'].includes(mime)?'位图':'图片（类型未知）';
 return {formula:'公式',composition:'组合'}[kind]??'公式';
}

// Read the saved root descriptor without registering assets or decoding images.
export async function imageTypeFromBundle(bytes){
 const files=await decodeZIP(bytes),decoder=new TextDecoder('utf-8',{fatal:true});
 const json=path=>{const value=files.get(path);if(!value)throw Error('缺少资源描述');return JSON.parse(decoder.decode(value));};
 const manifest=json('manifest.json'),content=json(manifest.content);
 const record=manifest.assets?.find(item=>item.id===content.root?.type);
 if(!record)return graphicTypeLabel('image');
 const asset=json(record.file);
 return graphicTypeLabel('image',asset.kind==='image'?asset.mime:undefined);
}
