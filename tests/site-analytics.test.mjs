import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyticsTarget,startSiteAnalytics} from '../web/site-analytics.js';

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
