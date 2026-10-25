import {editorIcon} from './editor-icons.js';
import {hoverHelp} from './hover-help.js';
import {uiText} from './ui-language.js';

export function createAnimationBadge(doc){
 const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 20 20');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const frame=doc.createElementNS(ns,'rect');for(const [key,value]of Object.entries({x:2.5,y:3.5,width:15,height:13,rx:2}))frame.setAttribute(key,value);
 const play=doc.createElementNS(ns,'path');play.setAttribute('d','M8 6.5 13 10 8 13.5Z');svg.append(frame,play);
 const badge=doc.createElement('span');for(const [key,value]of Object.entries({class:'graphic-animated',role:'img','aria-label':uiText('library.animatedBadge'),title:uiText('library.animatedHint')}))badge.setAttribute(key,value);badge.append(svg);return badge;
}

export function createShaderBadge(doc,{className,label,hint}){
 const badge=doc.createElement('button');badge.type='button';badge.className='shader-badge '+className;badge.setAttribute('aria-label',label);badge.append(editorIcon('shader',doc));
 badge.onkeydown=event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();};hoverHelp(badge,hint);return badge;
}
