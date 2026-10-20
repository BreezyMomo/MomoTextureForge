import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  newLayer,
  sanitize,
  frameState,
  encodeHash,
  decodeHash,
} from "../web/state.js";
import {
  prepareSeamlessState,
  effectiveSeamlessPattern,
  seamlessKind,
} from "../web/seamless.js";

test("v4 seamless state round trips and v1/v2/v3 keep tiling disabled", () => {
  const s = defaults();
  s.output.seamless = true;
  s.output.seamMode = 1;
  s.output.seamBlend = 0.3;
  assert.deepEqual(decodeHash(encodeHash(s)), s);
  for (const version of [1, 2, 3]) {
    const old = sanitize({ ...s, version });
    assert.equal(old.version, 5);
    assert.equal(old.output.seamless, false);
    assert.equal(old.output.seamMode, 0);
  }
  assert.equal(
    sanitize({ ...s, output: { ...s.output, seamBlend: 99, seamMode: 99 } })
      .output.seamBlend,
    0.45,
  );
});
test("seamless effective constraints leave original parameters intact including masks", () => {
  const s = defaults();
  s.output.seamless = true;
  s.layers[0] = newLayer("Brick");
  s.layers[0].params[0] = 7;
  s.layers[0].uv = [1.3, 33, 0.4, -0.2, 0.5, 27, 4];
  s.layers[0].polar = true;
  s.layers[0].mask = "Checker";
  s.layers[0].maskParams = [...newLayer("Checker").params];
  s.layers[0].maskParams[2] = 5;
  const copy = structuredClone(s),
    effective = prepareSeamlessState(s);
  assert.deepEqual(s, copy);
  assert.equal(effective.layers[0].params[0] % 2, 0);
  assert.equal(effective.layers[0].maskParams[2] % 2, 0);
  assert.equal(effective.layers[0].uv[0], 1);
  assert.equal(effective.layers[0].uv[1], 0);
  assert.equal(effective.layers[0].uv[6], 0);
  assert.equal(effective.layers[0].polar, false);
  s.output.seamless = false;
  assert.deepEqual(prepareSeamlessState(s), s);
});
test("animation is evaluated before snapping; geometry and generic modes preserve distinct policies", () => {
  const s = defaults();
  s.output.seamless = true;
  s.layers[0] = newLayer("Brick");
  s.animation.tracks = {
    "layers.0.params.0": [
      [0, 5],
      [3, 11],
    ],
  };
  assert.equal(
    prepareSeamlessState(frameState(s, 0).state).layers[0].params[0],
    6,
  );
  assert.equal(
    prepareSeamlessState(frameState(s, 3).state).layers[0].params[0],
    12,
  );
  const shape = effectiveSeamlessPattern(
    "Gear",
    newLayer("Gear").params,
    [8, 37, 2, 2, 1, 30, 2],
  );
  assert.ok(shape.uv[0] < 8);
  assert.equal(shape.uv[1], 37);
  assert.equal(shape.kind, 2);
  const blend = effectiveSeamlessPattern(
    "Gear",
    newLayer("Gear").params,
    [8, 37, 2, 2, 1, 30, 2],
    1,
  );
  assert.deepEqual(blend.uv, [8, 37, 2, 2, 1, 30, 2]);
  assert.equal(blend.kind, 0);
  assert.equal(seamlessKind("Smoke"), 0);
  assert.equal(seamlessKind("FBM"), 1);
});

test('native reference periodic counts snap slot zero without changing edge widths',()=>{
 for(const type of ['VoronoiEdges','CrackedMud','CrackedTiles','FBM']){
  const params=newLayer(type).params;const before=[...params];const got=effectiveSeamlessPattern(type,params,[1.3,37,.2,.4,0,0,0]);
  assert.equal(got.kind,1);assert.equal(got.params[0],Math.max(1,Math.round(params[0]/1.3)));assert.equal(got.params[2],before[2]);assert.deepEqual(params,before);assert.equal(got.uv[1],0);assert.equal(seamlessKind(type,1),0);
 }
});
