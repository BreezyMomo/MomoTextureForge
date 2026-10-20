import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID, CATALOG } from "../web/catalog.js";
import { defaults, newLayer, sanitize, frameState, encodeHash, decodeHash } from "../web/state.js";
import { defaultArrangement, effectiveArrangement } from "../web/arrangement.js";
import { prepareSeamlessState } from "../web/seamless.js";

test("new shapes append stable IDs and extended controls survive preset/hash round trip", () => {
  assert.equal(BY_ID.get("VortexGate").index, 282);
  assert.equal(BY_ID.get("NaturalWood").index, 283);
  assert.equal(BY_ID.get("NaturalWood").zh, "自然木纹");
  const wood=defaults();wood.layers=[newLayer("NaturalWood")];
  const woodSpec=BY_ID.get("NaturalWood");assert.equal(woodSpec.parameters.length,16);
  for(const spec of woodSpec.parameters)wood.layers[0].params[spec.slot]=spec.max;
  const restoredWood=decodeHash(encodeHash(wood)).layers[0];
  assert.equal(restoredWood.type,"NaturalWood");
  assert.deepEqual(restoredWood.params,wood.layers[0].params);
  assert.deepEqual(CATALOG.filter(x=>['Teardrop','Leaf','BezierRibbon'].includes(x.id)).map((x) => x.id), ["Teardrop", "Leaf", "BezierRibbon"]);
  const s = defaults();
  s.layers = [newLayer("BezierRibbon"), newLayer("Leaf"), newLayer("Teardrop")];
  s.layers[0].params[11] = .6;
  s.layers[0].params[12] = 1;
  s.layers[0].mask = "BezierRibbon";
  s.layers[0].maskParams = [...newLayer("BezierRibbon").params];
  s.layers[0].maskParams[9] = .1;
  s.layers[0].arrange[0] = 2;
  s.layers[0].maskArrange[0] = 1;
  assert.equal(s.layers[0].params.length, 16);
  assert.deepEqual(decodeHash(encodeHash(s)), s);
});
test("v1–v4 preserve old Star and seamless settings while discarding hidden new controls", () => {
  for (const version of [1,2,3,4]) {
    const s = defaults(); s.version = version;
    s.layers[0] = newLayer("Star"); s.layers[0].params[1] = .2; s.layers[0].params[5] = 1;
    s.layers[0].mask = "Star"; s.layers[0].maskParams = [...s.layers[0].params];
    s.layers[0].arrange[0] = 3; s.output.seamless = true;
    s.animation.tracks = { "layers.0.params.1": [[0,.1]], "layers.0.maskParams.5": [[0,1]], "layers.0.arrange.0": [[0,3]], "layers.0.params.0": [[0,.3],[3,.8]] };
    const result = sanitize(s);
    assert.equal(result.version, 5);
    assert.equal(result.layers[0].params[5], 2);
    assert.equal(result.layers[0].maskParams[5], 2);
    assert.equal(result.layers[0].params[1], 0);
    assert.equal(result.layers[0].arrange[0], 0);
    assert.deepEqual(Object.keys(result.animation.tracks), ["layers.0.params.0"]);
    assert.equal(result.output.seamless, version===4);
  }
});
test("curve extension and independent arrangement keyframes interpolate and clamp", () => {
  const s = defaults(); s.layers[0] = newLayer("BezierRibbon");
  s.layers[0].mask = "Leaf"; s.layers[0].maskParams = [...newLayer("Leaf").params];
  s.layers[0].arrange = Array(16).fill(9999);
  s.animation.tracks = {
    "layers.0.params.11": [[0,0],[3,1]], "layers.0.params.12": [[0,0],[3,1]],
    "layers.0.arrange.3": [[0,2],[3,64]], "layers.0.maskArrange.4": [[0,.1],[3,.7]],
    "layers.0.params.99": [[0,1]], "layers.0.arrange.__proto__": [[0,1]],
  };
  const clean = sanitize(s), at = frameState(clean,1.5).state;
  assert.equal(clean.layers[0].arrange[0],12);
  assert.equal(clean.layers[0].arrange[1]*clean.layers[0].arrange[2],64);
  assert.equal(at.layers[0].params[11],.5);
  assert.equal(at.layers[0].params[12],1);
  assert.equal(at.layers[0].arrange[3],33);
  assert.ok(Math.abs(at.layers[0].maskArrange[4]-.4)<1e-9);
  assert.equal(Object.keys(clean.animation.tracks).length,4);
});
test("seamless arrangements preserve source UV and raw size while bounding the effective footprint", () => {
  const s = defaults(); s.output.seamless = true;
  s.layers[0] = newLayer("FBM"); s.layers[0].uv=[1.4,33,.1,.2,0,0,1];
  s.layers[0].arrange[0]=1; s.layers[0].arrange[4]=2; s.layers[0].arrange[9]=.9;
  const before=structuredClone(s), after=prepareSeamlessState(s);
  assert.deepEqual(s,before);
  assert.deepEqual(after.layers[0].uv,s.layers[0].uv);
  assert.deepEqual(after.layers[0].params,s.layers[0].params);
  assert.ok(after.layers[0].arrange[4]*1.9*Math.SQRT2/2<=.450001);
  assert.deepEqual(effectiveArrangement(defaultArrangement(),false),defaultArrangement());
});
