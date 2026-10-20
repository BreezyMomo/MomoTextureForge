// Three separable box passes approximate Gaussian filtering in linear time.
// Only coverage is filtered; source RGB and source asset bytes stay intact.
export function denoiseContourCoverage(pixels,width,height,radius=0){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||pixels.length!==width*height*4||!Number.isInteger(radius)||radius<0||radius>12)throw Error('轮廓去噪参数无效');
 if(!radius)return pixels;
 let a=Float32Array.from({length:width*height},(_,i)=>pixels[i*4+3]),b=new Float32Array(a.length);
 const span=radius*2+1;
 function pass(horizontal){const lines=horizontal?height:width,length=horizontal?width:height,step=horizontal?1:width;
  for(let line=0;line<lines;line++){const start=horizontal?line*width:line;let sum=0;for(let k=-radius;k<=radius;k++)sum+=a[start+Math.min(length-1,Math.max(0,k))*step];
   for(let i=0;i<length;i++){b[start+i*step]=sum/span;sum+=a[start+Math.min(length-1,i+radius+1)*step]-a[start+Math.max(0,i-radius)*step];}
  }[a,b]=[b,a];
 }
 for(let i=0;i<3;i++){pass(true);pass(false);}
 const result=new Float32Array(pixels);for(let i=0;i<a.length;i++)result[i*4+3]=Math.max(0,Math.min(1,a[i]));return result;
}
