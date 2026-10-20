import test from "node:test";
import assert from "node:assert/strict";
import {isStandalone,pageHref} from "../web/distribution.js";

test("standalone views and example editing stay in the same HTML; hosted navigation retains page routes",()=>{
  const documentBefore=globalThis.document,locationBefore=globalThis.location;
  try {
    globalThis.document={documentElement:{dataset:{distribution:"standalone"}}};
    globalThis.location={href:"file:///C:/Shared/MomoTextureForge.html?view=examples#old"};
    assert.equal(isStandalone(),true);
    assert.equal(pageHref("editor","#fx=test"),"file:///C:/Shared/MomoTextureForge.html#fx=test");
    assert.equal(pageHref("examples"),"file:///C:/Shared/MomoTextureForge.html?view=examples");
    assert.equal(pageHref("validate"),"file:///C:/Shared/MomoTextureForge.html?view=validate");
    globalThis.document.documentElement.dataset={};
    globalThis.location.href="http://localhost:8787/examples.html";
    assert.equal(isStandalone(),false);
    assert.equal(pageHref("editor","#fx=test"),"http://localhost:8787/#fx=test");
    assert.equal(pageHref("examples"),"http://localhost:8787/examples.html");
  } finally {
    if(documentBefore===undefined)delete globalThis.document;else globalThis.document=documentBefore;
    if(locationBefore===undefined)delete globalThis.location;else globalThis.location=locationBefore;
  }
});
