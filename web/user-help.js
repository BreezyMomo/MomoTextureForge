import {uiError,uiText} from './ui-language.js';
import {interfaceLanguage} from './language.js';
import englishHelp from './locales/help-en.js';
import manual from './effects-kit-runtime.js';
const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=uiText(text);return e;};
const quickStart='help.quickStart.body';
export const HELP_SECTIONS=[
 ['start',"help.quickStart",quickStart],
 ['workspace',"help.workspaceResources",manual['references/workspace.md']],
 ['layout',"help.arrangementCompositing",manual['references/layout-compositing.md']],
 ['animation',"help.animationExport",manual['references/animation-export.md']],
 ['image',"help.creatingResourcesImageProcessing",manual['references/image-editor.md']],
 ['recipes',"help.effectRecipesTroubleshooting",manual['references/recipes.md']]
].map(([id,title,body])=>({id,title,body}));
// Render only the small Markdown subset used by our bundled manual. All text
// goes through textContent; no HTML from documentation is executed.
function renderManual(host,text){
 host.replaceChildren();const lines=text.replace(/<!-- doc-language -->[\s\S]*?<!-- \/doc-language -->\s*/g,'').split('\n');let list=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line){list=null;continue;}
  const heading=/^(#{1,3}) (.+)$/.exec(line);
  if(heading){host.append(el('h'+Math.min(3,heading[1].length+1),heading[2]));list=null;continue;}
  if(line.startsWith('|')&&/^\|[\s:|-]+\|$/.test(lines[i+1]?.trim()??'')){
   const wrap=el('div');wrap.className='help-table';const table=el('table'),head=el('thead'),body=el('tbody');
   const row=(value,tag)=>{const tr=el('tr');for(const cell of value.split('|').slice(1,-1))tr.append(el(tag,cell.trim()));return tr;};
   head.append(row(line,'th'));i+=2;for(;i<lines.length&&lines[i].trim().startsWith('|');i++)body.append(row(lines[i].trim(),'td'));i--;
   table.append(head,body);wrap.append(table);host.append(wrap);list=null;continue;
  }
  const item=/^(- |\d+\. )(.+)$/.exec(line);
  if(item){const tag=item[1].startsWith('-')?'ul':'ol';if(!list||list.tagName.toLowerCase()!==tag){list=el(tag);host.append(list);}list.append(el('li',item[2]));continue;}
  list=null;host.append(el('p',line));
 }
}
export function openUserHelp({onValidate}={}){
 const existing=document.querySelector('.user-help-dialog');if(existing){existing.focus();return;}
 const dialog=el('dialog'),header=el('header'),title=el('h2',uiText("editor.quickGuide")),close=el('button',uiText("common.close")),search=el('input'),layout=el('div'),nav=el('nav'),article=el('article'),status=el('p');
 dialog.className='user-help-dialog';dialog.setAttribute('aria-labelledby','user-help-title');title.id='user-help-title';
 close.setAttribute('aria-label',uiText("help.close"));close.onclick=()=>dialog.close();
 header.append(title);if(onValidate){const validate=el('button',uiText("help.inspectAllPatterns"));validate.onclick=onValidate;header.append(validate);}header.append(close);
 search.type='search';search.placeholder=uiText("help.searchFeaturesParametersOrIssuesEGMaskLoopSVG");search.setAttribute('aria-label',uiText("help.searchHelp"));
 layout.className='user-help-layout';nav.setAttribute('aria-label',uiText("help.helpContents"));article.tabIndex=0;article.setAttribute('aria-label',uiText("help.helpArticle"));status.setAttribute('role','status');
 layout.append(nav,article);dialog.append(header,search,status,layout);document.body.append(dialog);let selected='start';
 function show(section){selected=section.id;renderManual(article,section.body);article.scrollTop=0;for(const b of nav.children)b.setAttribute('aria-pressed',String(b.dataset.section===selected));}
 function filter(){const q=search.value.trim().toLocaleLowerCase(),matches=HELP_SECTIONS.map(s=>({...s,title:uiText(s.title),body:s.id==='start'?uiText(s.body):interfaceLanguage()==='en'?(englishHelp[s.id]??s.body):s.body})).filter(s=>(s.title+' '+s.body).toLocaleLowerCase().includes(q));nav.replaceChildren();status.textContent=(q ? (matches.length ? ((uiText("help.found") + matches.length) + uiText("help.relatedChapters")) : uiText("help.noMatchingChaptersTryAnotherKeyword")) : '');status.hidden=!q;
  for(const section of matches){const b=el('button',section.title);b.dataset.section=section.id;b.onclick=()=>show(section);nav.append(b);}
  if(matches.length)show(matches.find(s=>s.id===selected)??matches[0]);else article.replaceChildren(el('p',uiText("help.trySearchingForImageParametersOrExport")));
 }
 search.oninput=filter;dialog.addEventListener('close',()=>dialog.remove(),{once:true});filter();dialog.showModal();search.focus();
}
