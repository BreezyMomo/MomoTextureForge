import {buildContourDocument} from './tree-psd-contours.js';
const xml=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const number=n=>{if(!Number.isFinite(n))throw Error('SVG路径坐标无效');return String(Math.round(n*100000)/100000);};
export function contourDocumentSVG({width,height,children}){
 function layer(item){if(item.children)return '<g><title>'+xml(item.name??'')+'</title>'+item.children.map(layer).join('')+'</g>';
  const paths=item.vectorMask.paths;let d='';for(const path of paths){if(path.open)throw Error('轮廓必须闭合');const knots=path.knots;if(!knots.length)continue;d+='M'+knots[0].points.slice(2,4).map(number).join(' ');for(let i=0;i<knots.length;i++){const a=knots[i].points,b=knots[(i+1)%knots.length].points;d+='C'+[a[4],a[5],b[0],b[1],b[2],b[3]].map(number).join(' ');}d+='Z';}
  const c=item.vectorFill.color,fill='#'+[c.r,c.g,c.b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
  return '<path fill="'+fill+'" fill-rule="evenodd" opacity="'+number(item.opacity??1)+'" d="'+d+'"><title>'+xml(item.name??'')+'</title></path>';
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+number(width)+'" height="'+number(height)+'" viewBox="0 0 '+number(width)+' '+number(height)+'">'+children.map(layer).join('')+'</svg>';
 const bytes=new TextEncoder().encode(svg).length;
 if(bytes>2*1024*1024)throw Error('当前SVG约 '+(Math.ceil(bytes/1048576*100)/100).toFixed(2)+' MB（上限 2.00 MB）。请降低采样尺寸、降低细节保留或开启平滑。如果原图分辨率已满足使用需求，可关闭“转为 SVG 路径”，直接使用图片；画布导出可改选 PNG。');return svg;
}
export async function exportContourSVG(project,options={}){const document=await buildContourDocument(project,options);options.stage?.('正在生成 SVG 文件…');return {svg:contourDocumentSVG(document),stats:document.stats,warnings:document.warnings};}
