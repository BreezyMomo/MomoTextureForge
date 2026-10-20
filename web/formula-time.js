// Ignore comments and migrated wrapper declarations; inspect the actual vector helper.
const clean=s=>s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
export function formulaUsesTime(definition,sources,libraries={}){
 const spec=definition.outputs.scalar;let body=clean(spec.inline??sources[spec.file]??'');
 const wrapper=/\b(ref_vector_\w+)\s*\(/.exec(body);
 if(wrapper){const all=clean(Object.values(libraries).join('\n')),start=all.indexOf(wrapper[1]+'('),open=all.indexOf('{',start);if(start>=0&&open>=0){let depth=1,end=open+1;while(end<all.length&&depth){if(all[end]==='{')depth++;if(all[end]==='}')depth--;end++;}const helper=all.slice(open+1,end-1);let callEnd=body.indexOf('(',wrapper.index)+1,nesting=1;while(callEnd<body.length&&nesting){if(body[callEnd]==='(')nesting++;if(body[callEnd]===')')nesting--;callEnd++;}body=body.slice(0,wrapper.index)+(/\btime\b/.test(helper)?'time':'0.')+body.slice(callEnd);}}
 return /\b(time|T)\b/.test(body);
}
export const formulaTime=(n,seconds)=>n.shapeClock?.follow===false?(n.shapeClock.value??0):seconds*(n.shapeClock?.speed??1)+(n.shapeClock?.offset??0);
