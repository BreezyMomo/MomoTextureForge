import {appearance,THEME_IDS,STYLE_IDS,DENSITY_IDS,normalizeAppearance} from './appearance.js';
import {uiText,localizeApplicationMarkup} from './ui-language.js';
import {onLanguageChange} from './language.js';
const themeKeys={system:'appearance.system',classic:'appearance.classic',graphite:'appearance.graphite',light:'appearance.light'};
const styleKeys={refined:'appearance.refined',standard:'appearance.standard',minimal:'appearance.minimal',soft:'appearance.soft'},densityKeys={compact:'appearance.compact',comfortable:'appearance.comfortable'};
const descriptionKeys={refined:'appearance.refinedDescription',standard:'appearance.standardDescription',minimal:'appearance.minimalDescription',soft:'appearance.softDescription'};
const swatches=[['#dfae72','appearance.amber'],['#79b8ff','appearance.blue'],['#b3a2ed','appearance.purple'],['#7ec5a5','appearance.green']];
export function openAppearanceSettings(){
 const existing=document.querySelector('.appearance-dialog');if(existing){existing.focus();return;}
 const returnFocus=document.activeElement,original=appearance.get();let accepted=false;
 const dialog=document.createElement('dialog');dialog.className='appearance-dialog';dialog.setAttribute('aria-labelledby','appearance-title');
 dialog.innerHTML=`<header><h2 id="appearance-title" data-i18n="appearance.title"></h2><button type="button" data-close data-i18n="common.close"></button></header>
 <div class="appearance-body"><section class="appearance-settings"><label for="appearance-theme" data-i18n="appearance.theme"></label><select id="appearance-theme"></select>
 <div class="appearance-layout-options"><div><label for="appearance-style" data-i18n="appearance.style"></label><select id="appearance-style" aria-describedby="appearance-style-description"></select></div><div><label for="appearance-density" data-i18n="appearance.density"></label><select id="appearance-density"></select></div></div><p id="appearance-style-description" class="appearance-style-description"></p>
 <label for="appearance-accent" data-i18n="appearance.accent"></label><div class="appearance-accent-row"><input id="appearance-accent" type="color"><input id="appearance-hex" type="text" maxlength="7" spellcheck="false" data-i18n-aria-label="appearance.hex" aria-describedby="appearance-description"></div>
 <div class="appearance-swatches" role="group" data-i18n-aria-label="appearance.swatches"></div><button type="button" data-reset data-i18n="appearance.reset"></button></section>
 <section class="appearance-preview" data-i18n-aria-label="appearance.preview"><p data-i18n="appearance.preview"></p><div class="appearance-preview-node" data-i18n="appearance.sampleNode"></div>
 <div class="appearance-preview-tabs"><span data-i18n="appearance.sampleShape"></span><span data-i18n="appearance.sampleTransform"></span><span data-i18n="appearance.sampleAnimation"></span></div>
 <div class="appearance-preview-module"><strong data-i18n="appearance.sampleParameters"></strong><div class="appearance-preview-module-body"><label data-i18n="appearance.sampleRadius"></label><div class="appearance-preview-value"><progress max="1" value="0.62" data-i18n-aria-label="appearance.sampleRadius"></progress><output>0.62</output></div></div></div><div class="appearance-preview-actions"><span data-i18n="appearance.previewHint"></span></div></section></div>
 <p class="appearance-storage-status" role="status"></p><footer><p id="appearance-description" data-i18n="appearance.independent"></p><div><button type="button" data-cancel data-i18n="common.cancel"></button><button type="button" class="primary" data-save data-i18n="appearance.save"></button></div></footer>`;
 const select=dialog.querySelector('#appearance-theme'),style=dialog.querySelector('#appearance-style'),density=dialog.querySelector('#appearance-density'),picker=dialog.querySelector('[type=color]'),hex=dialog.querySelector('[type=text]'),status=dialog.querySelector('[role=status]');
 for(const [control,ids,keys]of [[select,THEME_IDS,themeKeys],[style,STYLE_IDS,styleKeys],[density,DENSITY_IDS,densityKeys]])for(const id of ids){const option=document.createElement('option');option.value=id;option.dataset.i18n=keys[id];control.append(option);}
 const colorButtons=[];
 for(const [color,key]of swatches){const button=document.createElement('button');button.type='button';button.style.setProperty('--swatch',color);button.dataset.i18nAriaLabel=key;button.dataset.i18nTitle=key;button.setAttribute('aria-pressed','false');button.onclick=()=>preview({...appearance.get(),accent:color});dialog.querySelector('.appearance-swatches').append(button);colorButtons.push([button,color]);}
 function sync(){const preferences=appearance.get(),palette=appearance.palette();select.value=preferences.theme;style.value=preferences.style;density.value=preferences.density;dialog.querySelector('#appearance-style-description').textContent=uiText(descriptionKeys[preferences.style]);picker.value=palette.accent;if(document.activeElement!==hex)hex.value=palette.accent.toUpperCase();for(const [button,color]of colorButtons)button.setAttribute('aria-pressed',String(palette.accent===color));}
 function preview(value){hex.setCustomValidity('');appearance.preview(value);status.textContent='';sync();}
 select.onchange=()=>preview({...appearance.get(),theme:select.value,accent:null});
 style.onchange=()=>preview({...appearance.get(),style:style.value});density.onchange=()=>preview({...appearance.get(),density:density.value});
 picker.oninput=()=>{preview({...appearance.get(),accent:picker.value});hex.value=picker.value.toUpperCase();};
 hex.oninput=()=>{hex.setCustomValidity('');if(/^#[a-f\d]{6}$/i.test(hex.value))preview({...appearance.get(),accent:hex.value});};
 hex.onchange=()=>{if(!/^#[a-f\d]{6}$/i.test(hex.value)){hex.setCustomValidity(uiText('appearance.invalidHex'));hex.reportValidity();}};
 dialog.querySelector('[data-reset]').onclick=()=>{preview({...appearance.get(),accent:null});hex.value=appearance.palette().accent.toUpperCase();};
 dialog.querySelector('[data-close]').onclick=dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 dialog.querySelector('[data-save]').onclick=()=>{if(!/^#[a-f\d]{6}$/i.test(hex.value)){hex.setCustomValidity(uiText('appearance.invalidHex'));hex.reportValidity();return;}if(!appearance.save(normalizeAppearance(appearance.get()))){status.textContent=uiText('appearance.storageUnavailable');return;}accepted=true;dialog.close();};
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 document.body.append(dialog);const disposeLanguage=localizeApplicationMarkup(dialog),disposeAppearance=appearance.subscribe(sync),disposeValidation=onLanguageChange(()=>{hex.setCustomValidity('');sync();});
 dialog.addEventListener('close',()=>{disposeLanguage();disposeAppearance();disposeValidation();if(!accepted)appearance.preview(original);dialog.remove();returnFocus?.focus();},{once:true});
 sync();dialog.showModal();select.focus();
}
