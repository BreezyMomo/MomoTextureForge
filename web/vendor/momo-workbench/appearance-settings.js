import {THEME_IDS,STYLE_IDS,DENSITY_IDS,TAB_STYLE_IDS,COLOR_ROLE_IDS,defaultAppearanceColors,createAppearance} from './appearance.js';
import {WORKBENCH_CATALOGS} from './locales.js';

let nextId=0;
const hexColor=value=>/^#[a-f\d]{6}$/i.test(value);
const tabKeys={classic:'appearance.tabsClassic',segmented:'appearance.tabsSegmented',pill:'appearance.tabsPill',underline:'appearance.tabsUnderline'};
const roleKeys=Object.fromEntries(COLOR_ROLE_IDS.map(role=>[role,'appearance.color.'+role]));

/** A single DOM implementation, also mountable from React. No product state is read. */
export function createAppearanceSettings({appearance,document:providedDocument,ui={},idPrefix}={}){
 if(!appearance)throw new TypeError('appearance is required');
 const prefix=idPrefix??(++nextId===1?'appearance':`appearance-${nextId}`);
 const text=key=>ui.text?.(key)??WORKBENCH_CATALOGS['zh-CN'][key]??key;
 const format=(key,...values)=>ui.format?.(key,...values)??text(key).replace(/\{(\d+)\}/g,(_,index)=>String(values[index]??''));
 let active=null,disposed=false;

 function open(){
  if(disposed)return;
  if(active){active.dialog.focus();return;}
  const doc=providedDocument??globalThis.document;
  if(!doc?.body)throw new TypeError('A document with a body is required');
  const before=appearance.get(),returnFocus=doc.activeElement;
  const dialog=doc.createElement('dialog');
  dialog.className='appearance-dialog momo-appearance-dialog';
  dialog.setAttribute('aria-labelledby',`${prefix}-title`);
  dialog.setAttribute('aria-describedby',`${prefix}-description`);
  dialog.innerHTML=`
   <header><h2 id="appearance-title" data-i18n="appearance.title"></h2><button type="button" data-close data-i18n="appearance.close"></button></header>
   <div class="appearance-scroll-body"><div class="appearance-body">
    <section class="appearance-settings">
     <label for="appearance-theme" data-i18n="appearance.theme"></label><select id="appearance-theme" aria-describedby="appearance-theme-description"></select><p id="appearance-theme-description" class="appearance-theme-description"></p>
     <fieldset class="appearance-theme-options">
      <section class="appearance-style-picker"><label id="appearance-styles-title" data-i18n="appearance.style"></label><div id="appearance-styles" class="appearance-styles" role="group" aria-labelledby="appearance-styles-title" aria-describedby="appearance-style-description"></div><p id="appearance-style-description" class="appearance-style-description"></p></section>
      <div class="appearance-layout-options"><div><label for="appearance-density" data-i18n="appearance.density"></label><select id="appearance-density"></select></div><div class="appearance-tabs-option"><label for="appearance-tabs" data-i18n="appearance.tabs"></label><select id="appearance-tabs" aria-describedby="appearance-tabs-help"></select><small id="appearance-tabs-help" data-i18n="appearance.tabsHelp"></small></div></div>
      <details id="appearance-colors" class="appearance-custom-colors"><summary data-i18n="appearance.customColors"></summary><p id="appearance-custom-help" data-i18n="appearance.customColorsHelp"></p><div class="appearance-color-fields"></div><button type="button" data-reset data-i18n="appearance.reset"></button></details>
     </fieldset>
    </section>
    <section class="appearance-preview" data-i18n-aria-label="appearance.preview"><p data-i18n="appearance.preview"></p><div class="appearance-palette-strip" role="group" data-i18n-aria-label="appearance.paletteRoles"></div>
     <div class="appearance-preview-dock dock-stack" aria-hidden="true" inert>
      <div class="appearance-preview-toolbar"><span data-i18n="appearance.sampleWorkspace"></span><button type="button" class="momo-button" data-i18n="appearance.sampleAction"></button><button type="button" class="momo-button" data-variant="primary" data-i18n="appearance.samplePrimary"></button></div>
      <div class="dock-stack-header"><div class="dock-tabs"><button type="button" class="dock-tab" aria-selected="true" data-i18n="appearance.samplePanel"></button><button type="button" class="dock-tab" aria-selected="false" data-i18n="appearance.sampleLibrary"></button></div></div>
      <div class="appearance-preview-content"><div class="appearance-preview-node" data-i18n="appearance.sampleSelection"></div>
       <div class="appearance-preview-tabs momo-tabs"><button type="button" aria-pressed="true" data-i18n="appearance.sampleGeneral"></button><button type="button" aria-pressed="false" data-i18n="appearance.sampleDetails"></button></div>
       <section class="appearance-preview-module momo-module"><h3 data-i18n="appearance.sampleParameters"></h3><div class="momo-module-body"><label class="momo-field"><span data-i18n="appearance.sampleValue"></span><div class="appearance-preview-value"><input type="range" min="0" max="100" value="62" tabindex="-1"><output>62</output></div></label><label class="momo-field"><span data-i18n="appearance.sampleOption"></span><select tabindex="-1"><option data-i18n="appearance.sampleDefault"></option></select></label></div></section>
      </div>
     </div><p class="appearance-preview-hint" data-i18n="appearance.previewHint"></p>
    </section>
   </div><p class="appearance-storage-status" role="status" aria-live="polite"></p></div>
   <footer><p id="appearance-description" data-i18n="appearance.independent"></p><div><button type="button" data-cancel data-i18n="appearance.cancel"></button><button type="button" data-variant="primary" data-save data-i18n="appearance.save"></button></div></footer>`;
  // Stable default IDs preserve existing integrations; other instances receive a prefix.
  for(const element of dialog.querySelectorAll('[id],[for],[aria-labelledby],[aria-describedby]')){
   for(const attr of ['id','for','aria-labelledby','aria-describedby']){
    const value=element.getAttribute(attr);if(value)element.setAttribute(attr,value.replace(/\bappearance-/g,prefix+'-'));
   }
  }
  const find=selector=>dialog.querySelector(selector);
  const theme=find('select[id$="-theme"]'),density=find('select[id$="-density"]'),tabs=find('select[id$="-tabs"]'),status=find('[role=status]');
  const addOption=(select,id,key)=>{const option=doc.createElement('option');option.value=id;option.dataset.i18n=key;select.append(option);};
  for(const id of THEME_IDS)addOption(theme,id,'appearance.preset.'+id);
  for(const id of DENSITY_IDS)addOption(density,id,'appearance.'+id);
  for(const id of TAB_STYLE_IDS)addOption(tabs,id,tabKeys[id]);
  const styleButtons=new Map(),colorFields=new Map();
  for(const id of STYLE_IDS){
   const button=doc.createElement('button');button.type='button';button.className='appearance-style-card';button.dataset.style=id;button.setAttribute('aria-pressed','false');
   button.innerHTML='<span class="appearance-style-art" aria-hidden="true"><i class="preset-mini-sidebar"></i><i class="preset-mini-tab"></i><i class="preset-mini-field"></i></span><span class="appearance-style-label"></span>';
   button.querySelector('.appearance-style-label').dataset.i18n='appearance.'+id;button.dataset.i18nTitle='appearance.'+id+'Description';
   button.onclick=()=>preview({...appearance.get(),style:id});find('.appearance-styles').append(button);styleButtons.set(id,button);
  }
  for(const role of COLOR_ROLE_IDS){
   const row=doc.createElement('div'),label=doc.createElement('label'),picker=doc.createElement('input'),hex=doc.createElement('input');
   row.className='appearance-color-field';row.dataset.colorRole=role;picker.type='color';picker.id=role==='action'?prefix+'-accent':prefix+'-color-'+role;label.htmlFor=picker.id;label.dataset.i18n=roleKeys[role];
   hex.type='text';hex.id=role==='action'?prefix+'-hex':prefix+'-hex-'+role;hex.maxLength=7;hex.spellcheck=false;hex.setAttribute('aria-describedby',prefix+'-custom-help');
   row.append(label,picker,hex);find('.appearance-color-fields').append(row);colorFields.set(role,{picker,hex});
   picker.oninput=()=>{setColor(role,picker.value);hex.value=picker.value.toUpperCase();};
   hex.oninput=()=>{hex.setCustomValidity('');if(hexColor(hex.value))setColor(role,hex.value);};
   hex.onchange=()=>{if(!hexColor(hex.value)){hex.setCustomValidity(text('appearance.invalidHex'));hex.reportValidity();}};
  }
  // The dialog uses the same complete theme as the workspace.
  const dialogAppearance=createAppearance({root:dialog});
  function localize(){
   for(const element of dialog.querySelectorAll('[data-i18n]'))element.textContent=text(element.dataset.i18n);
   for(const element of dialog.querySelectorAll('[data-i18n-title]'))element.title=text(element.dataset.i18nTitle);
   for(const element of dialog.querySelectorAll('[data-i18n-aria-label]'))element.setAttribute('aria-label',text(element.dataset.i18nAriaLabel));
  }
  function sync(){
   const preferences=appearance.get(),palette=appearance.palette();
   dialogAppearance.preview(preferences);
   theme.value=preferences.theme;density.value=preferences.density;tabs.value=preferences.tabs;
   find('[id$="-theme-description"]').textContent=text('appearance.preset.'+preferences.theme+'Description');
   find('[id$="-style-description"]').textContent=text('appearance.'+preferences.style+'Description');
   for(const [id,button]of styleButtons)button.setAttribute('aria-pressed',String(id===preferences.style));
   for(const [role,{picker,hex}]of colorFields){const color=preferences.colors[role]??palette.colors[role];picker.value=color;if(doc.activeElement!==hex)hex.value=color.toUpperCase();hex.setAttribute('aria-label',format('appearance.colorHex',text(roleKeys[role])));}
   const colors={base:palette.surfaces.bg,header:palette.roles.header,panel:palette.surfaces.panel,text:palette.surfaces.text,action:palette.accent,selection:palette.roles.selection};
   find('.appearance-palette-strip').replaceChildren(...Object.entries(colors).map(([role,color])=>{
    const chip=doc.createElement('span'),swatch=doc.createElement('i'),label=doc.createElement('span');chip.className='appearance-palette-color';chip.dataset.paletteRole=role;chip.style.setProperty('--palette-color',color);label.textContent=text('appearance.role.'+role);chip.title=format('appearance.paletteColor',label.textContent,color.toUpperCase());chip.append(swatch,label);return chip;
   }));
  }
  function clearValidation(){for(const {hex}of colorFields.values())hex.setCustomValidity('');}
  function preview(value){clearValidation();statusKey='';status.textContent='';appearance.preview(value);}
  function setColor(role,color){const preferences=appearance.get();preview({...preferences,colors:{...preferences.colors,[role]:color}});}
  theme.onchange=()=>preview({...appearance.get(),theme:theme.value,colors:defaultAppearanceColors()});
  density.onchange=()=>preview({...appearance.get(),density:density.value});tabs.onchange=()=>preview({...appearance.get(),tabs:tabs.value});
  find('[data-reset]').onclick=()=>preview({...appearance.get(),colors:defaultAppearanceColors()});
  let accepted=false,cleaned=false;
  const disposeAppearance=appearance.subscribe(sync);
  let statusKey='';
  const disposeLanguage=ui.onLanguageChange?.(()=>{clearValidation();localize();sync();status.textContent=statusKey?text(statusKey):'';});
  function cleanup(){
   if(cleaned)return;cleaned=true;disposeAppearance();disposeLanguage?.();dialogAppearance.dispose();
   if(!accepted)appearance.preview(before);
   dialog.remove();if(active?.dialog===dialog)active=null;
   if(returnFocus?.isConnected)returnFocus.focus();
  }
  const close=()=>{dialog.close();cleanup();};
  find('[data-close]').onclick=find('[data-cancel]').onclick=close;
  find('[data-save]').onclick=()=>{
   for(const {hex}of colorFields.values())if(!hexColor(hex.value)){
    find('[id$="-colors"]').open=true;hex.setCustomValidity(text('appearance.invalidHex'));hex.reportValidity();return;
   }
   const saved=appearance.save(appearance.get());
   if(!saved){statusKey='appearance.storageUnavailable';status.textContent=text(statusKey);return;}
   accepted=true;close();
  };
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',cleanup,{once:true});
  active={dialog,close};doc.body.append(dialog);localize();sync();
  dialog.showModal();theme.focus();
 }
 return {open,dispose(){if(disposed)return;active?.close();disposed=true;}};
}
