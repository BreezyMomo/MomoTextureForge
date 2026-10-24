// Shared geometry for editor controls. Icons carry no translated text or project data.
const paths={
 play:'m8 4 12 8-12 8Z',pause:'M8 4v16M16 4v16',
 reset:'M3 10a9 9 0 1 1 2 8M3 4v6h6',
 keyframe:'m12 3 9 9-9 9-9-9Z',
 drag:'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01',
 more:'M5 12h.01M12 12h.01M19 12h.01',
 help:'M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 chevron:'m8 5 7 7-7 7',down:'m5 8 7 7 7-7',
 pin:'M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6',
 trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
 shape:'m12 3 9 9-9 9-9-9Z',group:'M3 7V4h7l2 3h9v13H3Z',
 image:'M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M15 7h.01',
 mask:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18M12 5l6 6m-6-1 7 7m-7-2 4 4',
 animation:'M4 3h16v18H4ZM9 8l7 4-7 4Z',
 select:'m4 3 14 9-7 1-3 7Z',pivot:'M12 3v18M3 12h18M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
 uv:'M4 4h16v16H4ZM4 12h16M12 4v16',pan:'M9 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 4-3 7-7 7h-1c-2 0-3-1-4-2l-5-6a2 2 0 0 1 3-3l2 2',
 snap:'M5 4v9a7 7 0 0 0 14 0V4h-4v9a3 3 0 0 1-6 0V4ZM5 8h4m6 0h4',
 display:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 tile:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',clear:'m6 6 12 12M6 18 18 6',edit:'m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z',frame:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5'
};
export function editorIcon(name,doc=globalThis.document){
 const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [key,value]of Object.entries({viewBox:'0 0 24 24',class:'editor-icon','aria-hidden':'true',focusable:'false',fill:'none',stroke:'currentColor','stroke-width':name==='drag'||name==='more'?'3':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
 const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]);svg.append(path);
 if(name==='keyframe'){const dot=doc.createElementNS(svg.namespaceURI,'circle');for(const [key,value]of Object.entries({cx:12,cy:12,r:2,class:'keyframe-dot'}))dot.setAttribute(key,value);svg.append(dot);}
 return svg;
}
