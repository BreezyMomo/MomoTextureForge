import test from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import {
  defaults,
  sanitize,
  frameState,
  dimensions,
  encodeHash,
  decodeHash,
  decodeJSON,
} from "../web/state.js";
import { CATALOG, CATEGORIES, BY_ID } from "../web/catalog.js";
import { patternGLSL, PATTERN_EXPRESSIONS } from "../web/patterns.js";
import {
  encodePNG,
  encodeEXR,
  encodeZIP,
  floatToHalf,
  halfToFloat,
  crc32,
} from "../web/encoders.js";

function readPNG(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [];
  let position = 8;
  while (position < bytes.length) {
    const length = view.getUint32(position),
      type = new TextDecoder().decode(bytes.slice(position + 4, position + 8)),
      data = bytes.slice(position + 8, position + 8 + length);
    assert.equal(
      view.getUint32(position + 8 + length),
      crc32(bytes.slice(position + 4, position + 8 + length)),
    );
    chunks.push({ type, data });
    position += 12 + length;
  }
  assert.equal(position, bytes.length);
  const head = chunks[0].data,
    hv = new DataView(head.buffer);
  return {
    width: hv.getUint32(0),
    height: hv.getUint32(4),
    depth: head[8],
    colorType: head[9],
    raw: inflateSync(
      Buffer.concat(
        chunks.filter((c) => c.type === "IDAT").map((c) => Buffer.from(c.data)),
      ),
    ),
  };
}
function readEXR(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(v.getUint32(0, true), 20000630);
  assert.equal(v.getUint32(4, true), 2);
  let p = 8;
  const attrs = {};
  function string() {
    const start = p;
    while (bytes[p] !== 0) p++;
    const s = new TextDecoder().decode(bytes.slice(start, p));
    p++;
    return s;
  }
  while (bytes[p]) {
    const name = string(),
      type = string(),
      length = v.getUint32(p, true);
    p += 4;
    attrs[name] = { type, data: bytes.slice(p, p + length) };
    p += length;
  }
  p++;
  const box = new DataView(attrs.dataWindow.data.buffer),
    w = box.getInt32(8, true) + 1,
    h = box.getInt32(12, true) + 1,
    zip = attrs.compression.data[0] === 3,
    count = Math.ceil(h / (zip ? 16 : 1)),
    pixels = new Float32Array(w * h * 4);
  for (let block = 0; block < count; block++) {
    const offset = Number(v.getBigUint64(p + block * 8, true)),
      y = v.getInt32(offset, true),
      length = v.getUint32(offset + 4, true),
      expected = w * Math.min(zip ? 16 : 1, h - y) * 8;
    let raw = bytes.slice(offset + 8, offset + 8 + length);
    if (length < expected) {
      raw = new Uint8Array(inflateSync(raw));
      for (let i = 1; i < raw.length; i++)
        raw[i] = (raw[i - 1] + raw[i] - 128) & 255;
      const decoded = new Uint8Array(raw.length),
        split = Math.ceil(raw.length / 2);
      for (let i = 0; i < decoded.length; i++)
        decoded[i] = raw[i % 2 === 0 ? i / 2 : split + (i - 1) / 2];
      raw = decoded;
    }
    assert.equal(raw.length, expected);
    const rv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    let n = 0;
    for (let row = 0; row < Math.min(zip ? 16 : 1, h - y); row++)
      for (const c of [3, 2, 1, 0])
        for (let x = 0; x < w; x++) {
          pixels[((y + row) * w + x) * 4 + c] = halfToFloat(
            rv.getUint16(n, true),
          );
          n += 2;
        }
  }
  return { w, h, zip, pixels, attrs };
}
function readZIP(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    end = bytes.length - 22;
  assert.equal(v.getUint32(end, true), 0x06054b50);
  const count = v.getUint16(end + 10, true),
    offset = v.getUint32(end + 16, true),
    entries = [];
  let p = 0;
  for (let i = 0; i < count; i++) {
    assert.equal(v.getUint32(p, true), 0x04034b50);
    const length = v.getUint32(p + 18, true),
      nameLength = v.getUint16(p + 26, true),
      extra = v.getUint16(p + 28, true),
      name = new TextDecoder().decode(bytes.slice(p + 30, p + 30 + nameLength)),
      data = bytes.slice(
        p + 30 + nameLength + extra,
        p + 30 + nameLength + extra + length,
      );
    assert.equal(v.getUint32(p + 14, true), crc32(data));
    entries.push({ name, data });
    p += 30 + nameLength + extra + length;
  }
  assert.equal(p, offset);
  let c = offset;
  for (const entry of entries) {
    assert.equal(v.getUint32(c, true), 0x02014b50);
    assert.equal(v.getUint32(c + 20, true), entry.data.length);
    const n = v.getUint16(c + 28, true);
    assert.equal(
      new TextDecoder().decode(bytes.slice(c + 46, c + 46 + n)),
      entry.name,
    );
    c += 46 + n;
  }
  assert.equal(c, end);
  return entries;
}

test("all catalogue entries have unique identities and explicit shader branches", () => {
  assert.equal(CATALOG.length, 305);
  assert.equal(BY_ID.size, CATALOG.length);
  assert.equal(
    CATEGORIES.reduce((n, c) => n + c.count, 0),
    CATALOG.length,
  );
  assert.equal(CATEGORIES.length, 17);
  assert.ok(
    PATTERN_EXPRESSIONS.every((x) => typeof x === "string" && x.length > 0),
  );
  assert.equal((patternGLSL().match(/case /g) || []).length, CATALOG.length);
  assert.equal((patternGLSL([0, 1]).match(/case /g) || []).length, 2);
});
test("defaults round trip without losing channels, layers or palette", () => {
  const state = defaults();
  assert.deepEqual(sanitize(state), state);
  assert.deepEqual(decodeHash(encodeHash(state)), state);
});
test("malformed and hostile imports are rejected or bounded without prototype writes", () => {
  assert.throws(() => decodeJSON("{"));
  assert.throws(() => sanitize({ version: 99 }));
  assert.throws(() => decodeJSON(" ".repeat(200001)));
  const state = defaults();
  state.layers[0].params = [Infinity, -2, 9999, NaN, -100, 2, -1, 999];
  state.order = [0, 0, 2];
  state.animation.tracks = {
    "__proto__.polluted": [[0, 1]],
    "layers.0.params.0": [
      [2, 999],
      [1, 0.3],
      [1, 0.4],
      [NaN, 1],
    ],
    "layers.0.uv.7": [[0, 1]],
  };
  const clean = sanitize(state);
  assert.deepEqual(clean.order, [0, 1, 2]);
  assert.equal(clean.layers[0].params[2], BY_ID.get('Circle').defaults[2]);
  assert.equal(clean.layers[0].params[6], 1);
  assert.equal(clean.layers[0].params[7], BY_ID.get('Circle').defaults[7]);
  assert.deepEqual(clean.animation.tracks, {
    "layers.0.params.0": [
      [1, 0.4],
      [2, 1.5],
    ],
  });
  assert.equal({}.polluted, undefined);
});
test("keyframe endpoints, interpolation, hold, smooth and pingpong", () => {
  const s = defaults();
  s.animation.duration = 4;
  s.animation.tracks = {
    "layers.0.params.0": [
      [1, 0.2],
      [3, 1],
    ],
  };
  assert.equal(frameState(s, 0).state.layers[0].params[0], 0.2);
  assert.equal(frameState(s, 4).state.layers[0].params[0], 1);
  assert.ok(Math.abs(frameState(s, 2).state.layers[0].params[0] - 0.6) < 1e-6);
  s.animation.ease = "hold";
  assert.equal(frameState(s, 2).state.layers[0].params[0], 0.2);
  s.animation.ease = "smooth";
  assert.ok(
    Math.abs(frameState(s, 1.5).state.layers[0].params[0] - 0.325) < 1e-6,
  );
  s.animation.pingpong = true;
  assert.equal(frameState(s, 1).time, 2);
  assert.equal(frameState(s, 3).time, 2);
  assert.equal(frameState(s, 4).time, 0);
  s.animation.enabled = false;
  assert.equal(frameState(s, 2).state.layers[0].params[0], 0.62);
});
test("aspect dimensions and allocation guard", () => {
  const s = defaults();
  s.output.aspect = 16 / 9;
  assert.deepEqual(dimensions(s, 1024), [1024, 576]);
  s.output.aspect = 0.5;
  assert.deepEqual(dimensions(s, 1024), [512, 1024]);
  s.output.custom = true;
  s.output.width = 8192;
  s.output.height = 8192;
  assert.throws(() => dimensions(s), /上限/);
});
test("PNG8 CRC, top-to-bottom samples, alpha and finite clamping", async () => {
  const pixels = new Float32Array([0, 0.5, 1, 0.25, 1, NaN, -1, 2]);
  const png = readPNG(await encodePNG(pixels, 2, 1, 8));
  assert.equal(png.depth, 8);
  assert.equal(png.colorType, 6);
  assert.deepEqual([...png.raw], [0, 0, 128, 255, 64, 255, 0, 0, 255]);
});
test("PNG16 preserves sub-8bit data and writes big endian samples", async () => {
  const pixels = new Float32Array([0.5001, 0.1, 0.9, 1]);
  const png = readPNG(await encodePNG(pixels, 1, 1, 16));
  assert.equal(png.depth, 16);
  assert.equal(png.raw.length, 9);
  assert.equal(png.raw.readUInt16BE(1), Math.round(pixels[0] * 65535));
  assert.notEqual(png.raw.readUInt16BE(1), 128 * 257);
  assert.equal(png.raw.readUInt16BE(7), 65535);
});
test("half encoding round-even, signs, subnormal, overflow and NaN", () => {
  for (const n of [0, -0, 1, -2, 0.5, 65504, 2 ** -24, 2 ** -14])
    assert.ok(Object.is(halfToFloat(floatToHalf(n)), n));
  assert.equal(floatToHalf(1 + 2 ** -11), 0x3c00);
  assert.equal(floatToHalf(1 + 3 * 2 ** -11), 0x3c02);
  assert.equal(floatToHalf(65520), 0x7c00);
  assert.equal(halfToFloat(floatToHalf(Infinity)), Infinity);
  assert.ok(Number.isNaN(halfToFloat(floatToHalf(NaN))));
});
for (const zip of [false, true])
  test(`EXR ${zip ? "ZIP16" : "uncompressed"} channel layout, offsets, HDR and final partial block`, async () => {
    const w = 19,
      h = 19,
      pixels = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        pixels.set([x / 16, y / 16, -0.5, 1], (y * w + x) * 4);
    const exr = readEXR(await encodeEXR(pixels, w, h, zip));
    assert.equal(exr.w, w);
    assert.equal(exr.h, h);
    assert.equal(exr.zip, zip);
    assert.equal(exr.attrs.channels.type, "chlist");
    for (let i = 0; i < pixels.length; i++)
      assert.equal(exr.pixels[i], halfToFloat(floatToHalf(pixels[i])));
  });
test("ZIP standard headers, UTF8 names, CRC and central offsets", () => {
  const input = [
    { name: "frame_000.png", data: new Uint8Array([1, 2, 3]) },
    { name: "帧配置.json", data: new TextEncoder().encode('{"version":1}') },
  ];
  assert.deepEqual(readZIP(encodeZIP(input)), input);
  assert.throws(() => encodeZIP([{ name: "../x", data: new Uint8Array() }]));
});
test("image encoders reject incorrect dimensions and lengths", async () => {
  await assert.rejects(() => encodePNG(new Float32Array(1), 1, 1), /Invalid/);
  await assert.rejects(() => encodeEXR(new Float32Array(4), 1.5, 1), /Invalid/);
  await assert.rejects(() => encodePNG(new Float32Array(4), 1, 1, 12));
});
