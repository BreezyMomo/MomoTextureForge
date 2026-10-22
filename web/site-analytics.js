// Only the official HTTPS deployments use the owner's public Baidu site IDs.
// This module is injected by build-pages.mjs, never by the offline build.
export function analyticsTarget(href){
 const url=new URL(href);
 if(url.protocol!=='https:'||url.port)return null;
 let id,base;
 if(url.hostname==='breezymomo.github.io'&&/^\/MomoTextureForge\/(?:index\.html|examples\.html)?$/.test(url.pathname)){
  id='067c64539a82f8a5cc10389781ba1b75';base='/MomoTextureForge/';
 }else if(url.hostname==='momo-texture-forge.app.workbuddy.host'&&/^\/(?:index\.html|examples\.html)?$/.test(url.pathname)){
  id='a22e68093f1a42a8cbfa480f7425636f';base='/';
 }else return null;
 const view=url.searchParams.get('view');
 if(view&&view!=='editor'&&view!=='examples')return null;
 return {id,path:base+(view==='examples'||url.pathname.endsWith('/examples.html')?'examples':'')};
}

export function startSiteAnalytics(win=window,doc=document){
 try{
  const target=analyticsTarget(win.location.href);
  if(!target||doc.getElementById('momo-site-analytics'))return false;
  const queue=win._hmt=win._hmt||[];
  // No automatic clicks/heatmaps or raw query/hash URLs from shared projects.
  queue.push(['_setAutoPageview',false]);
  queue.push(['_setAutoEventTracking',false]);
  let referrer='';
  try{const url=new URL(doc.referrer);if(/^https?:$/.test(url.protocol))referrer=url.origin+'/';}catch{}
  queue.push(['_setReferrerOverride',referrer]);
  queue.push(['_trackPageview',target.path]);
  const script=doc.createElement('script');
  script.id='momo-site-analytics';script.async=true;
  script.referrerPolicy='no-referrer';
  script.src='https://hm.baidu.com/hm.js?'+target.id;
  doc.head.append(script);
  return true;
 }catch{return false;}
}

if(typeof window!=='undefined')startSiteAnalytics();
