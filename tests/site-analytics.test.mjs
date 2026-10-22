import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyticsTarget,startSiteAnalytics} from '../web/site-analytics.js';
import {EXPORT_COMPLETED_EVENT,signalExportComplete} from '../web/export-events.js';

test('analytics allowlist excludes local, offline, forks, other projects and validation',()=>{
 for(const url of ['file:///C:/MomoTextureForge.html','http://127.0.0.1:8799/','https://example.com/','https://breezymomo.github.io/another/','https://breezymomo.github.io/MomoTextureForge-copy/','https://momo-texture-forge.app.workbuddy.host:8443/','https://momo-texture-forge.app.workbuddy.host/?view=validate'])assert.equal(analyticsTarget(url),null,url);
 assert.equal(analyticsTarget('https://breezymomo.github.io/MomoTextureForge/?view=examples#tree=secret').path,'/MomoTextureForge/examples');
 assert.equal(analyticsTarget('https://momo-texture-forge.app.workbuddy.host/?sharecode=secret#tree=private').path,'/');
});

test('one sanitized pageview, no automatic events, no project parameters or referrer query',()=>{
 const scripts=[],win={location:{href:'https://momo-texture-forge.app.workbuddy.host/?sharecode=SECRET#tree=PRIVATE'}};
 const doc={referrer:'https://example.com/private-path?token=REFERRER_SECRET',getElementById:id=>scripts.find(s=>s.id===id),createElement:()=>({}),head:{append:s=>scripts.push(s)}};
 assert.equal(startSiteAnalytics(win,doc),true);
 assert.equal(startSiteAnalytics(win,doc),false);
 assert.deepEqual(win._hmt,[['_setAutoPageview',false],['_setAutoEventTracking',false],['_setReferrerOverride','https://example.com/'],['_trackPageview','/']]);
 assert.equal(scripts.length,1);assert.equal(scripts[0].referrerPolicy,'origin');assert.equal(scripts[0].async,true);
 assert.equal(scripts[0].src,'https://hm.baidu.com/hm.js?a22e68093f1a42a8cbfa480f7425636f');
 assert.doesNotMatch(JSON.stringify([win._hmt,scripts]),/SECRET|PRIVATE|private-path/);
});

test('analytics loading failures never prevent the editor from starting',()=>{
 assert.equal(startSiteAnalytics({location:{href:'file:///tool.html'}},{}),false);
 assert.equal(startSiteAnalytics({location:{href:'https://breezymomo.github.io/MomoTextureForge/'}},{getElementById(){throw Error('blocked');}}),false);
});

function analyticsWindow(href='https://momo-texture-forge.app.workbuddy.host/'){
 const events=new Map(),scripts=[];
 const win={location:{href},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},addEventListener:(name,fn)=>events.set(name,fn),dispatchEvent:event=>events.get(event.type)?.(event)};
 const doc={referrer:'',getElementById:id=>scripts.find(s=>s.id===id),createElement:()=>({}),head:{append:s=>scripts.push(s)}};
 return {win,doc,events};
}

test('completed export events use bounded format/channel labels and distinguish clipboard',()=>{
 const {win,doc}=analyticsWindow();startSiteAnalytics(win,doc);startSiteAnalytics(win,doc);
 for(const format of ['png','exr','svg','psd','psd-vector','frames','atlas','atlas-exr','batch','batch-atlas'])for(const channel of ['color','height','normal','rgba'])signalExportComplete({action:'download',format,channel,name:'PRIVATE',pixels:'PRIVATE'},win);
 signalExportComplete({action:'clipboard',format:'png',channel:'normal'},win);
 const events=win._hmt.filter(e=>e[0]==='_trackEvent');
 assert.equal(events.length,41);
 assert.deepEqual(events[0],['_trackEvent','export','download','png/color']);
 assert.deepEqual(events.at(-1),['_trackEvent','export','clipboard','png/normal']);
 assert.doesNotMatch(JSON.stringify(win._hmt),/PRIVATE/);
});

test('malformed signals, previews and arbitrary labels cannot reach the analytics queue',()=>{
 const {win,doc}=analyticsWindow();startSiteAnalytics(win,doc);const count=win._hmt.length;
 for(const detail of [null,{}, {action:'download',format:'atlas-preview',channel:'color'},{action:'click',format:'png',channel:'color'},{action:'clipboard',format:'exr',channel:'color'},{action:'download',format:'PRIVATE',channel:'color'},{action:'download',format:'png',channel:'PRIVATE'}])win.dispatchEvent(new win.CustomEvent(EXPORT_COMPLETED_EVENT,{detail}));
 assert.equal(win._hmt.length,count);
});

test('offline/local/fork exports never create a Baidu queue or subscribe to completion signals',()=>{
 for(const href of ['file:///tool.html','http://127.0.0.1:8799/','https://example.com/']){
  const {win,doc,events}=analyticsWindow(href);assert.equal(startSiteAnalytics(win,doc),false);
  signalExportComplete({action:'download',format:'png',channel:'color'},win);
  assert.equal(events.size,0);assert.equal(win._hmt,undefined);
 }
});

test('broken analytics cannot turn a completed download into an export failure',()=>{
 const {win,doc}=analyticsWindow();startSiteAnalytics(win,doc);win._hmt={push(){throw Error('blocked');}};
 assert.equal(signalExportComplete({action:'download',format:'png',channel:'color'},win),true);
 assert.equal(signalExportComplete({action:'download',format:'png',channel:'color'},{dispatchEvent(){throw Error('blocked');}}),false);
});
