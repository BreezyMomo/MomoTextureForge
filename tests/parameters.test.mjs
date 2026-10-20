import test from "node:test";
import assert from "node:assert/strict";
import { CATALOG, BY_ID } from "../web/catalog.js";
import { PARAMETER_LAYOUTS } from "../web/parameter-layouts.js";
import {
  defaults,
  newLayer,
  sanitize,
  frameState,
  encodeHash,
  decodeHash,
} from "../web/state.js";

test("all patterns have explicit usable schemas with valid defaults and unique slots", () => {
  assert.equal(Object.keys(PARAMETER_LAYOUTS).length, CATALOG.length);
  for (const type of CATALOG) {
    assert.ok(
      type.parameters.length > 0 && type.parameters.length <= 16,
      type.id,
    );
    assert.equal(
      new Set(type.parameters.map((p) => p.slot)).size,
      type.parameters.length,
      type.id,
    );
    for (const p of type.parameters) {
      assert.ok(
        p.label && p.slot >= 0 && p.slot <= 15 && p.min < p.max && p.step > 0,
        type.id,
      );
      assert.ok(
        p.default >= p.min && p.default <= p.max,
        type.id + " " + p.label,
      );
    }
    const s = defaults();
    s.layers[0] = newLayer(type.id);
    assert.deepEqual(
      sanitize(s),
      s,
      type.id + " defaults do not survive a save",
    );
  }
  assert.deepEqual(
    BY_ID.get("Circle").parameters.map((p) => p.label),
    ["半径", "内径", "羽化"],
  );
  assert.deepEqual(
    BY_ID.get("Brick").parameters.map((p) => p.label),
    ["列数", "行数", "灰缝", "行错位", "柔和"],
  );
  assert.ok(BY_ID.get("FBM").parameters.some((p) => p.label === "八度"));
  assert.ok(
    BY_ID.get("RoundedRect").parameters.some((p) => p.label === "半高"),
  );
});
test("v2 clamps by active pattern and drops hidden controls, including keyframes", () => {
  const s = defaults();
  s.layers[0] = newLayer("FBM");
  s.layers[0].params[0] = 0.3;
  s.layers[0].params[2] = 99;
  s.animation.tracks = {
    "layers.0.params.0": [
      [0, 0],
      [3, 20],
    ],
    "layers.0.params.4": [[0, 0.3]],
  };
  const clean = sanitize(s);
  assert.equal(clean.layers[0].params[0], 1);
  assert.equal(clean.layers[0].params[2], 0.9);
  assert.deepEqual(clean.animation.tracks["layers.0.params.0"], [
    [0, 1],
    [3, 20],
  ]);
  assert.equal(clean.animation.tracks["layers.0.params.4"], undefined);
  assert.equal(frameState(clean, 1.5).state.layers[0].params[0], 10.5);
});
test("v1 migrates newly meaningful slots without turning old circles into holes or FBM into one octave", () => {
  const s = defaults();
  s.version = 1;
  s.layers[0].mask = "Ring";
  s.layers[0].params = [0.62, 0.025, 8, 0.015, 0.5, 0.25, 1, 0.2];
  s.layers[1] = {
    ...newLayer("FBM"),
    params: [0.62, 0.12, 8, 0.015, 0.5, 0.25, 1, 0.2],
  };
  s.layers[2] = {
    ...newLayer("Brick"),
    params: [0.62, 0.12, 8, 0.015, 0.5, 0.25, 1, 0.2],
  };
  s.animation.tracks = {
    "layers.0.params.0": [
      [0, 0.2],
      [3, 0.8],
    ],
    "layers.1.params.0": [
      [0, 0.4],
      [3, 1],
    ],
  };
  const migrated = sanitize(s);
  assert.equal(migrated.version, 5);
  assert.equal(migrated.layers[0].params[1], 0);
  assert.equal(migrated.layers[0].maskParams[1], 0.08);
  assert.equal(migrated.layers[1].params[0], 5);
  assert.equal(migrated.layers[2].params[0], 4);
  assert.equal(migrated.layers[2].params[5], 0.5);
  assert.deepEqual(migrated.animation.tracks["layers.0.params.0"], [
    [0, 0.2],
    [3, 0.8],
  ]);
  assert.equal(migrated.animation.tracks["layers.1.params.0"], undefined);
  assert.deepEqual(decodeHash(encodeHash(s)), migrated);
});
test("v3 gear profiles round trip and v1/v2 never activate old hidden tooth slots", () => {
  const s = defaults();
  s.layers[0] = newLayer("Gear");
  s.layers[0].mask = "Gear";
  s.layers[0].maskParams = [...BY_ID.get("Gear").defaults];
  s.layers[0].params[5] = 0.7;
  s.layers[0].params[6] = 0.3;
  s.layers[0].maskParams[6] = 0;
  s.animation.tracks = {
    "layers.0.params.6": [
      [0, 0],
      [3, 1],
    ],
    "layers.0.params.0": [
      [0, 0.2],
      [3, 0.7],
    ],
    "layers.0.maskParams.5": [
      [0, 0.2],
      [3, 0.8],
    ],
  };
  assert.deepEqual(decodeHash(encodeHash(s)), s);
  assert.equal(frameState(s, 1.5).state.layers[0].params[6], 0.5);
  for (const version of [1, 2]) {
    const old = { ...s, version };
    const migrated = sanitize(old);
    assert.equal(migrated.version, 5);
    assert.equal(migrated.layers[0].params[5], 0.5);
    assert.equal(migrated.layers[0].params[6], 1);
    assert.equal(migrated.layers[0].maskParams[5], 0.5);
    assert.equal(migrated.layers[0].maskParams[6], 1);
    assert.equal(migrated.animation.tracks["layers.0.params.6"], undefined);
    assert.equal(migrated.animation.tracks["layers.0.maskParams.5"], undefined);
    assert.deepEqual(
      migrated.animation.tracks["layers.0.params.0"],
      s.animation.tracks["layers.0.params.0"],
    );
  }
});
test("mask parameters and their keyframes use the selected mask schema and round trip", () => {
  const s = defaults();
  s.layers[0].mask = "Brick";
  s.layers[0].maskParams = [...BY_ID.get("Brick").defaults];
  s.layers[0].maskParams[0] = 18;
  s.animation.tracks = {
    "layers.0.maskParams.0": [
      [0, 6],
      [3, 18],
    ],
    "layers.0.maskParams.4": [[0, 0.5]],
  };
  const clean = sanitize(s);
  assert.equal(clean.layers[0].maskParams[0], 18);
  assert.equal(clean.animation.tracks["layers.0.maskParams.4"], undefined);
  assert.equal(frameState(clean, 1.5).state.layers[0].maskParams[0], 12);
  assert.deepEqual(decodeHash(encodeHash(clean)), clean);
});
