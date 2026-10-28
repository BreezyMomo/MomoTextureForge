import './appearance.js';
import './site-analytics.js';
import {startupStage,mountStartupContent,completeStartup,failStartup} from './startup.js';
import {uiText} from './ui-language.js';

// Hosted views share one URL so existing example/share links remain valid.
async function openView(){
 const view=new URLSearchParams(location.search).get('view')||'editor';
 try{
  if(view==='examples'||view==='validate'){
   await startupStage(uiText(view==='examples'?'startup.preparingExamples':'startup.preparingValidation'));
   const html=view==='examples'?(await import('./examples.html')).default:(await import('./validate.html')).default;
   const parsed=new DOMParser().parseFromString(html,'text/html'),key=view==='examples'?'ui.momoTextureForgeExamples':'ui.momoTextureForgeValidation';
   document.querySelector('title').dataset.i18n=key;document.title=uiText(key);
   for(const script of parsed.body.querySelectorAll('script'))script.remove();
   mountStartupContent(parsed.body.innerHTML);
   for(const source of parsed.head.querySelectorAll('style'))document.head.append(source.cloneNode(true));
   if(view==='examples')await import('./examples.js');
   else{document.body.style.cssText='padding:24px;max-width:900px;margin:auto';await import('./validate.js');}
  }else{
   await startupStage(uiText('ui.readingGraphicsAndLocalResources'));
   const {restoreAssets}=await import('./resource-assets.js');await restoreAssets();
   await startupStage(uiText('ui.preparingEditor'));await (await import('./tree-app.js')).ready;
  }
  await completeStartup();
 }catch(error){failStartup(error);console.error(error);}
}
await openView();
