import {WORKBENCH_CATALOGS} from './locales.js';

/** Binds the shared appearance entry to an existing button; the product owns its placement. */
export function createAppearanceTrigger({button,appearance,settings,ui={}}={}){
 if(button?.tagName!=='BUTTON'||!appearance||!settings)throw new TypeError('A button, appearance controller and settings are required');
 const attributes=['class','type','aria-haspopup','aria-label','title','style','data-momo-header-control'];
 const before=Object.fromEntries(attributes.map(name=>[name,button.getAttribute(name)])),children=[...button.childNodes];
 const swatch=button.ownerDocument.createElement('span'),label=button.ownerDocument.createElement('span');
 swatch.className='momo-appearance-swatch';swatch.setAttribute('aria-hidden','true');
 label.className='momo-header-label';
 button.classList.add('momo-header-button','momo-appearance-trigger');button.type='button';button.dataset.momoHeaderControl='true';button.setAttribute('aria-haspopup','dialog');button.replaceChildren(swatch,label);
 const update=()=>{
  label.textContent=ui.text?.('appearance.title')??WORKBENCH_CATALOGS['zh-CN']['appearance.title'];
  button.setAttribute('aria-label',label.textContent);button.title=label.textContent;
  swatch.style.backgroundColor=appearance.palette().accent;
 };
 const open=()=>settings.open();button.addEventListener('click',open);
 const offAppearance=appearance.subscribe(update),offLanguage=ui.onLanguageChange?.(update);let disposed=false;update();
 return{dispose(){
  if(disposed)return;disposed=true;offAppearance();offLanguage?.();button.removeEventListener('click',open);button.replaceChildren(...children);
  for(const [name,value]of Object.entries(before)){if(value===null)button.removeAttribute(name);else button.setAttribute(name,value);}
 }};
}
