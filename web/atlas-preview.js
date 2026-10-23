// Keep the preview useful even when the requested delivery atlas exceeds its budget.
// Frame count, order and columns stay unchanged; only sampling resolution is reduced.
export function atlasPreviewDimensions(width,height,frames,columns){
 const cols=Math.min(columns,frames),rows=Math.ceil(frames/cols);
 const scale=Math.min(1,128/Math.max(width,height),2048/(cols*width),2048/(rows*height),Math.sqrt(4194304/(width*height*frames)));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}

export const animationExportKind=kind=>['gif','frames','atlas','atlas-exr','batch-atlas'].includes(kind);
export const exportPreviewKey=(project,kind,batchSize=128)=>JSON.stringify([kind,kind==='batch-atlas'?batchSize:null,project]);
