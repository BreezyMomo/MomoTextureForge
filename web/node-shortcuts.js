import {editorIcon} from './editor-icons.js';
import {uiText,uiFormat} from './ui-language.js';
import {CURVE_CHANNELS,curveTangents} from './channel-curves.js';

export const NODE_SHORTCUTS_KEY='momo-texture-tree:node-shortcuts:v1';
export const SHORTCUT_TABS={
 'modules.shapeParameters':'shape','editor.bodyCornersSquare':'shape','editor.shapeUV':'shape','editor.shapeAnimation':'shape','editor.opacity':'shape','editor.nodeColors':'shape','modules.levels':'shape','modules.invert':'shape','curves.title':'shape',
 'editor.nodeRegion':'layout','editor.contentArrangement':'layout','editor.advancedRandomnessPosition':'layout','editor.layoutVariationGradientFlow':'layout','editor.tileConnectors':'layout',
 'modules.blending':'composite','editor.contourProcessing':'composite','modules.imageFilters':'composite',
 'editor.playbackInParent':'animation','editor.advancedTimeControls':'animation','editor.nodeParameterAnimation':'animation'
};
export const SHORTCUT_MODULES=Object.keys(SHORTCUT_TABS);

// Workspace preferences, keyed by instance ID, never enter resources or undo history.
export function nodeShortcutState(storage){
 const clean=keys=>Array.isArray(keys)?[...new Set(keys.filter(key=>SHORTCUT_MODULES.includes(key)))]:[];
 let entries=new Map(),defaults=[];
 try{const saved=JSON.parse(storage?.getItem(NODE_SHORTCUTS_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved)){const modern=saved.version===2,nodes=modern?saved.nodes:saved;defaults=modern?clean(saved.defaults):[];if(nodes&&typeof nodes==='object'&&!Array.isArray(nodes))entries=new Map(Object.entries(nodes).filter(([id,value])=>id.length<=128&&(modern?value&&typeof value==='object':Array.isArray(value))).slice(-2048).map(([id,value])=>[id,{pinned:clean(modern?value.pinned:value),hidden:modern?clean(value.hidden):[]}]));}}catch{}
 const get=id=>{const local=entries.get(id);return [...new Set([...defaults.filter(key=>!local?.hidden.includes(key)),...(local?.pinned??[])])];};
 function save(){for(const [id,value]of entries)if(!value.pinned.length&&!value.hidden.length)entries.delete(id);while(entries.size>2048)entries.delete(entries.keys().next().value);try{storage?.setItem(NODE_SHORTCUTS_KEY,JSON.stringify({version:2,defaults,nodes:Object.fromEntries(entries)}));}catch{}}
 return {
  get,global:key=>defaults.includes(key),
  copyTree(source,target){
   const copies=[];function visit(from,to){if(!from||!to)return;const local=entries.get(from.id);if(local&&from.id!==to.id)copies.push([to.id,structuredClone(local)]);for(let i=0;i<(from.children?.length??0);i++)visit(from.children[i],to.children?.[i]);visit(from.mask,to.mask);}visit(source,target);
   if(copies.length){for(const [id,local]of copies)entries.set(id,local);save();}
  },
  toggle(id,key){if(!SHORTCUT_MODULES.includes(key))return;const active=get(id).includes(key),local=entries.get(id)??{pinned:[],hidden:[]};local.pinned=local.pinned.filter(k=>k!==key);local.hidden=local.hidden.filter(k=>k!==key);if(active&&defaults.includes(key))local.hidden.push(key);if(!active&&!defaults.includes(key))local.pinned.push(key);entries.delete(id);entries.set(id,local);save();},
  toggleAll(key){if(!SHORTCUT_MODULES.includes(key))return;defaults=defaults.includes(key)?defaults.filter(k=>k!==key):[...defaults,key];for(const local of entries.values())local.hidden=local.hidden.filter(k=>k!==key);save();}
 };
}

export function shortcutPin(document,{key,pinned,onToggle}){
 const button=document.createElement('button');button.type='button';button.className='module-pin';button.setAttribute('aria-pressed',String(pinned));button.title=uiFormat(pinned?'shortcuts.unpin':'shortcuts.pin',uiText(key));button.setAttribute('aria-label',button.title);
 button.append(editorIcon('pin',document));button.onclick=event=>{event.preventDefault();event.stopPropagation();onToggle(key);};return button;
}

export function shortcutControls(document,{key,pinned,onToggle,global=false,onToggleAll}){
 const group=document.createElement('span');group.className='shortcut-pin-controls';group.append(shortcutPin(document,{key,pinned,onToggle}));
 const scope=document.createElement('button');scope.type='button';scope.className='shortcut-scope';scope.append(editorIcon('more',document));scope.title=uiFormat('shortcuts.scopeFor',uiText(key));scope.setAttribute('aria-label',scope.title);scope.setAttribute('aria-haspopup','dialog');scope.setAttribute('aria-expanded','false');scope.dataset.global=String(global);group.append(scope);
 scope.onclick=event=>{
  event.preventDefault();event.stopPropagation();document.querySelector('.shortcut-scope-menu')?.remove();
  const popup=document.createElement('div');popup.className='shortcut-scope-menu';popup.setAttribute('popover','auto');popup.setAttribute('role','dialog');popup.setAttribute('aria-label',scope.title);
  const title=document.createElement('strong');title.textContent=uiText(key);popup.append(title);
  for(const [label,checked,action]of [['shortcuts.currentNode',pinned,()=>onToggle(key)],['shortcuts.allNodes',global,()=>onToggleAll(key)]]){const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=checked;input.setAttribute('aria-label',uiText(label));input.onchange=()=>{popup.hidePopover();popup.remove();action();};row.append(input,document.createTextNode(uiText(label)));popup.append(row);}
  const hint=document.createElement('p');hint.textContent=uiText('shortcuts.scopeHint');popup.append(hint);popup.addEventListener('keydown',event=>event.stopPropagation());popup.addEventListener('toggle',event=>{if(event.newState==='closed'){scope.setAttribute('aria-expanded','false');popup.remove();}});document.body.append(popup);popup.showPopover();scope.setAttribute('aria-expanded','true');popup.querySelector('input').focus({preventScroll:true});
  const box=scope.getBoundingClientRect(),width=popup.getBoundingClientRect().width;popup.style.left=Math.max(8,Math.min(box.right-width,document.defaultView.innerWidth-width-8))+'px';popup.style.top=Math.max(8,Math.min(box.bottom+5,document.defaultView.innerHeight-popup.getBoundingClientRect().height-8))+'px';
 };
 return group;
}

export function curvePreview(document,curves,open){
 const button=document.createElement('button');button.type='button';button.className='node-shortcut-curve';button.setAttribute('aria-label',uiText('shortcuts.editCurves'));button.title=uiText('shortcuts.editCurves');
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 220 62');svg.setAttribute('aria-hidden','true');
 const add=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);};
 for(let i=1;i<4;i++){add('line',{x1:i*55,y1:0,x2:i*55,y2:62,class:'curve-grid'});add('line',{x1:0,y1:i*15.5,x2:220,y2:i*15.5,class:'curve-grid'});}
 const colors={luminance:'var(--ui-accent-text)',rgb:'var(--ui-text)',red:'#ed8f8f',green:'#9bcd96',blue:'#8daeee',alpha:'#bcb0e0'},changed=CURVE_CHANNELS.filter(key=>curves[key].some(([x,y])=>Math.abs(x-y)>1e-6));
 for(const key of changed.length?changed:['luminance']){const points=curves[key],slopes=curveTangents(points),xy=(x,y)=>`${4+x*212},${58-y*54}`;let d='M'+xy(...points[0]);for(let i=1;i<points.length;i++){const [a,b]=[points[i-1],points[i]],h=(b[0]-a[0])/3;d+=' C'+xy(a[0]+h,a[1]+slopes[i-1]*h)+' '+xy(b[0]-h,b[1]-slopes[i]*h)+' '+xy(...b);}add('path',{d,fill:'none',class:'curve-path',style:'stroke:'+colors[key]});}
 const text=document.createElement('span');text.textContent=uiText('shortcuts.editCurves');button.append(svg,text);button.onclick=open;return button;
}
