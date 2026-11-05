import {WORKBENCH_CATALOGS} from './locales.js';

/** Owns only this select's presentation. Language state and storage stay in the controller. */
export function createLanguageSelector({select,language,ui={},onError}={}){
 if(!select||select.tagName!=='SELECT'||!language)throw new TypeError('A select and language controller are required');
 const attributes=['class','aria-label','title','data-momo-language-selector'];
 const before=Object.fromEntries(attributes.map(name=>[name,select.getAttribute(name)])),children=[...select.childNodes],value=select.value;
 const text=key=>ui.text?.(key)??WORKBENCH_CATALOGS[language.interfaceLanguage()]?.[key]??WORKBENCH_CATALOGS['zh-CN'][key]??key;
 select.classList.add('momo-language-selector');select.dataset.momoLanguageSelector='true';
 const options=language.SUPPORTED_LANGUAGES.map(({code,name})=>{
  const option=select.ownerDocument.createElement('option');option.value=code;option.textContent=name;option.lang=code;return option;
 });
 // Customizable selects give the displayed value a real flex box. Older browsers retain the native select.
 const customizable=select.ownerDocument.defaultView?.CSS?.supports?.('appearance','base-select');
 if(customizable){
  const button=select.ownerDocument.createElement('button'),content=select.ownerDocument.createElement('selectedcontent');
  button.className='momo-language-value';button.type='button';button.append(content);select.replaceChildren(button,...options);
 }else select.replaceChildren(...options);
 const update=()=>{select.value=language.interfaceLanguage();select.setAttribute('aria-label',text('language.interface'));select.title=text('language.switchInterface');};
 const change=()=>{try{language.setLanguage(select.value);}catch(error){onError?.(error);}finally{update();}};
 select.addEventListener('change',change);
 const unsubscribe=language.onLanguageChange(update);let disposed=false;update();
 return {dispose(){
  if(disposed)return;disposed=true;unsubscribe();select.removeEventListener('change',change);select.replaceChildren(...children);
  for(const [name,original]of Object.entries(before)){if(original===null)select.removeAttribute(name);else select.setAttribute(name,original);}
  select.value=value;
 }};
}
