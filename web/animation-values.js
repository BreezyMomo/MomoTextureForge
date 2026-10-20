// Shared by interactive preview, component thumbnails and every export format.
export const timeKey=t=>String(Math.round(t*1e6)/1e6);
export function interpolateKeys(track,t){
 const k=track.keys;if(!k?.length)return null;if(t<=k[0][0])return k[0][1];
 for(let i=1;i<k.length;i++){if(Math.abs(t-k[i][0])<=1e-9)return k[i][1];if(t<=k[i][0]){
  const [a,b]=[k[i-1],k[i]],span=b[0]-a[0];if(span<=0)return b[1];let u=(t-a[0])/span;
  const segment=track.segments?.[timeKey(a[0])],ease=segment?.ease??track.ease??'linear';
  if(track.type==='discrete'||ease==='hold'||typeof a[1]==='boolean')return t===b[0]?b[1]:a[1];
  if(ease==='smooth')u=u*u*(3-2*u);
  if(track.type==='color'||typeof a[1]==='string'&&/^#[0-9a-f]{6}$/i.test(a[1])){
   return '#'+[1,3,5].map(j=>Math.round(parseInt(a[1].slice(j,j+2),16)*(1-u)+parseInt(b[1].slice(j,j+2),16)*u).toString(16).padStart(2,'0')).join('');
  }
  if(typeof a[1]!=='number')return t===b[0]?b[1]:a[1];
  if(ease==='cubic'){
   const slope=(b[1]-a[1])/span,m0=segment?.out??slope,m1=segment?.in??slope;
   return (2*u**3-3*u*u+1)*a[1]+(u**3-2*u*u+u)*span*m0+(-2*u**3+3*u*u)*b[1]+(u**3-u*u)*span*m1;
  }
  return a[1]+(b[1]-a[1])*u;
 }}return k.at(-1)[1];
}
