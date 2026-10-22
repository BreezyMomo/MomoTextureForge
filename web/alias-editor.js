import {normalizeGraphicAliases,resolveGraphicName} from './graphic-name.js';
import {messageError} from './message-catalog.js';
import {uiError,uiText} from './ui-language.js';
import {normalizeAliases,parameterAliases} from './parameter-metadata.js';
import {parameterLabel,SUPPORTED_LANGUAGES,languageOrder} from './language.js';

// Language types come exclusively from the build configuration. Imported
// aliases in other languages are preserved without exposing editable codes.
export function createAliasEditor(spec,{onchange=()=>{},doc=document,kind='parameter',defaultName=()=>spec.name}={}){
 const graphic=kind==='graphic',normalize=graphic?normalizeGraphicAliases:normalizeAliases;const root=doc.createElement('details');root.className='parameter-aliases'+(graphic?' graphic-name-aliases':'');
 const summary=doc.createElement('summary');summary.textContent=uiText(graphic?'graphicName.aliases':'ui.multilingualAliases');root.append(summary);
 const list=doc.createElement('div');root.append(list);const rows=[];
 const hint=doc.createElement('small');hint.textContent=uiText(graphic?'graphicName.hint':'ui.usesGlobalLanguagePriorityShowsTheVariableIfNoAliasMatches');root.append(hint);
 const known=new Set(SUPPORTED_LANGUAGES.map(l=>l.code)),aliases=graphic?(normalizeGraphicAliases(spec.aliases)??{}):parameterAliases(spec),preserved=Object.fromEntries(Object.entries(aliases).filter(([language])=>!known.has(language)));
 function read(){const names={...aliases},seen=new Set();for(const language of known)if(!rows.some(row=>row.language.value===language))delete names[language];for(const row of rows){const language=row.language.value;if(!known.has(language))throw messageError("ui.chooseAConfiguredLanguage");if(seen.has(language))throw messageError("errors.duplicateAliasLanguage", language);seen.add(language);names[language]=row.value.value;}return normalize(names);}
 const optionEditors=[];
 function readOptions(){return spec.options?.map((option,i)=>({...option,aliases:optionEditors[i].read()}));}
 function changed(){try{const names=read();hint.textContent=uiText("ui.display")+(graphic?resolveGraphicName({...spec,name:defaultName(),aliases:names},languageOrder()):parameterLabel({...spec,aliases:names}));hint.setAttribute('role','status');onchange(names,readOptions());}catch(error){hint.textContent=uiError(error);}}
 const button=doc.createElement('button');button.type='button';button.textContent=uiText("ui.addLanguage");
 function syncChoices(){for(const row of rows)for(const option of row.language.options)option.disabled=rows.some(other=>other!==row&&other.language.value===option.value);button.disabled=rows.length>=SUPPORTED_LANGUAGES.length;}
 function add(language,value=''){
  language??=SUPPORTED_LANGUAGES.find(l=>!rows.some(row=>row.language.value===l.code))?.code;if(!language)return;
  const line=doc.createElement('div');line.className='parameter-alias-row';
  const code=doc.createElement('select');code.setAttribute('aria-label',uiText(graphic?'graphicName.language':'ui.aliasLanguage'));
  for(const item of SUPPORTED_LANGUAGES){const option=doc.createElement('option');option.value=item.code;option.textContent=item.name;code.append(option);}code.value=language;
  const name=doc.createElement('input');name.type='text';name.value=value;name.placeholder=uiText("ui.displayName");name.setAttribute('aria-label',uiText(graphic?'graphicName.alias':'ui.parameterAlias'));name.maxLength=graphic?80:128;
  const remove=doc.createElement('button');remove.type='button';remove.textContent='−';remove.title=uiText("ui.removeAlias");
  const row={language:code,value:name};rows.push(row);remove.onclick=()=>{rows.splice(rows.indexOf(row),1);line.remove();syncChoices();changed();};code.onchange=()=>{syncChoices();changed();};name.oninput=changed;
  line.append(code,name,remove);list.append(line);syncChoices();
 }
 for(const [language,value]of Object.entries(aliases))if(known.has(language))add(language,value);
 button.onclick=()=>{add();changed();};root.append(button);syncChoices();
 if(Object.keys(preserved).length){const note=doc.createElement('small');note.textContent=uiText("ui.thisResourceContainsAliasesForInactiveLanguagesTheyArePreservedWhen");root.append(note);}
 for(const option of spec.options??[]){const label=doc.createElement('p');label.textContent=uiText("ui.option")+option.value;root.append(label);const editor=createAliasEditor(option,{doc,onchange:changed});optionEditors.push(editor);root.append(editor.element);}
 return {element:root,read,readOptions,refresh:changed};
}
