import test from 'node:test';
import assert from 'node:assert/strict';
import {PANEL_IDS,layoutPreset,sanitizeLayout,sanitizeLayoutSettings,visitLayout,panelStack,dockPanel,floatPanel,closePanel,showPanel,activatePanel} from '../web/dock-layout.js';

function panels(layout){const list=[];visitLayout(layout,n=>{if(n.kind==='stack')list.push(...n.panels);});assert.equal(new Set(list).size,list.length,'each panel must have one owner');return list.sort();}
test('presets expose the expected panels',()=>{
 assert.deepEqual(panels(layoutPreset()),['canvas','inspector','library','nodes']);
 assert.deepEqual(panels(layoutPreset('animation')),[...PANEL_IDS].sort());
 assert.deepEqual(panels(layoutPreset('focus')),['canvas']);
});
test('default matches the reference four-column order and gives the canvas most of the width',()=>{
 const columns=[];
 function measure(n,start=0,width=1){
  if(n.kind==='stack'){columns.push({panels:n.panels,start,width});return;}
  assert.equal(n.axis,'x','default panels occupy the full workspace height');
  measure(n.first,start,width*n.ratio);measure(n.second,start+width*n.ratio,width*(1-n.ratio));
 }
 const layout=layoutPreset();measure(layout.root);
 assert.deepEqual(columns.map(c=>c.panels),[['library'],['nodes'],['canvas'],['inspector']]);
 for(const [index,expected]of [.13,.10,.59,.18].entries())assert.ok(Math.abs(columns[index].width-expected)<.01);
 assert.deepEqual(sanitizeLayout(layout),layout,'default ratios survive persistence without clamping');
 assert.deepEqual(layout.floats,[]);
});
test('a new default does not replace an existing current or named layout',()=>{
 const custom=layoutPreset('animation');custom.root.ratio=.29;
 const saved=sanitizeLayoutSettings({current:custom,named:[{name:'My workspace',layout:custom}]});
 assert.deepEqual(saved.current,custom);assert.deepEqual(saved.named[0].layout,custom);
 assert.deepEqual(sanitizeLayoutSettings(null).current.root.first.first.panels,['library']);
});
test('merge, split, detach, close and reopen retain one panel owner without changing input',()=>{
 const original=layoutPreset(),snapshot=JSON.stringify(original),target=panelStack(original,'inspector').id;
 let layout=dockPanel(original,'library',target);assert.equal(JSON.stringify(original),snapshot);
 assert.deepEqual(panelStack(layout,'library').panels,['inspector','library']);assert.equal(panelStack(layout,'library').active,'library');
 layout=activatePanel(layout,'inspector');assert.equal(panelStack(layout,'library').active,'inspector');
 layout=dockPanel(layout,'library',target,'bottom');assert.notEqual(panelStack(layout,'library').id,target);
 layout=floatPanel(layout,'library');assert.equal(layout.floats.length,1);assert.equal(layout.floats[0].root.active,'library');
 const floatId=layout.floats[0].id;layout=activatePanel(layout,'canvas');assert.equal(layout.floats[0].id,floatId,'floating frame IDs survive state updates');
 layout=dockPanel(layout,'library',panelStack(layout,'canvas').id,'left');assert.equal(layout.floats.length,0);
 assert.deepEqual(panels(layout),panels(original));layout=closePanel(layout,'inspector');assert.equal(panelStack(layout,'inspector'),null);
 layout=showPanel(layout,'inspector');assert.deepEqual(panels(layout),panels(original));
});
test('moving a tab within its own stack splits only when there are other tabs',()=>{
 let layout=layoutPreset('focus');const target=panelStack(layout,'canvas').id;
 layout=dockPanel(layout,'canvas',target,'left');assert.equal(layout.root.kind,'stack');
 layout=dockPanel(layout,'inspector',target);layout=dockPanel(layout,'inspector',target,'right');
 assert.equal(layout.root.kind,'split');assert.deepEqual(panels(layout),['canvas','inspector']);
});
test('empty workspace and floating-only workspace can recover through show',()=>{
 let layout=layoutPreset('focus');layout=closePanel(layout,'canvas');assert.equal(layout.root,null);
 assert.deepEqual(panels(showPanel(layout,'nodes')),['nodes']);
 layout=floatPanel(layout,'canvas');layout=showPanel(layout,'timeline');assert.ok(layout.root);assert.deepEqual(panels(layout),['canvas','timeline']);
 layout=dockPanel(layout,'canvas','root','top');assert.equal(layout.floats.length,0);assert.deepEqual(panels(layout),['canvas','timeline']);
});
test('restoration rejects unknown panels, duplicate ownership, invalid IDs and unsafe bounds',()=>{
 const bad={root:{kind:'split',id:'bad"id',ratio:10,first:{kind:'stack',id:'same',panels:['canvas','canvas','alien'],active:'alien'},second:{kind:'stack',id:'same',panels:['canvas','inspector'],active:'canvas'}},floats:[{id:'same',root:{kind:'stack',panels:['nodes']},w:9,h:9,x:null,y:null}]};
 const clean=sanitizeLayout(bad);assert.deepEqual(panels(clean),['canvas','inspector','nodes']);assert.equal(clean.root.ratio,.99);
 assert.equal(panelStack(clean,'inspector').active,'inspector');assert.equal(clean.floats[0].x,0);assert.equal(clean.floats[0].y,0);
 const ids=[];visitLayout(clean,n=>ids.push(n.id));ids.push(clean.floats[0].id);assert.equal(new Set(ids).size,ids.length);assert.ok(ids.every(id=>/^[\w-]+$/.test(id)));
 const cycle={kind:'split'};cycle.first=cycle;assert.equal(sanitizeLayout({root:cycle}).root,null);
 assert.deepEqual(sanitizeLayout(clean),clean,'valid layout round trips without changing IDs');
});
test('saved layouts store geometry only, sanitize names and preserve deliberately empty layouts',()=>{
 const layout=floatPanel(layoutPreset(),'library'),raw={current:layout,named:[{name:' 工作台 ',layout},{name:'工作台',layout},{name:'',layout}]};
 const settings=sanitizeLayoutSettings(raw);assert.equal(settings.named.length,1);assert.equal(settings.named[0].name,'工作台');
 assert.deepEqual(sanitizeLayoutSettings(JSON.parse(JSON.stringify(settings))),settings);
 assert.deepEqual(panels(sanitizeLayoutSettings({current:{}}).current),panels(layoutPreset()));
 assert.equal(sanitizeLayoutSettings({current:{root:null,floats:[]}}).current.root,null);
 assert.deepEqual(sanitizeLayout({floats:[null,1,'invalid']}),{root:null,floats:[]});assert.equal(sanitizeLayoutSettings({named:[null,1]}).named.length,0);
});
