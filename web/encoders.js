// PNG, ZIP and OpenEXR are written from their published binary layouts; no third-party encoder dependency.
const utf8 = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let n = i;
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes) {
  let n = 0xffffffff;
  for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
const concat = (parts) => {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
};
const number = (n, size = 4, little = true) => {
  const b = new Uint8Array(size);
  const d = new DataView(b.buffer);
  size === 8
    ? d.setBigUint64(0, BigInt(n), little)
    : size === 2
      ? d.setUint16(0, n, little)
      : d.setUint32(0, n, little);
  return b;
};
const cstring = (s) => concat([utf8.encode(s), new Uint8Array(1)]);
async function deflate(bytes) {
  if (typeof CompressionStream === "undefined")
    throw new Error("浏览器不支持压缩流，请使用新版 Chrome/Edge");
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function checkImage(pixels, w, h) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    w * h > 16777216 ||
    pixels.length !== w * h * 4
  )
    throw new Error("Invalid image dimensions or pixel count");
}
function chunk(type, data) {
  const tag = utf8.encode(type);
  return concat([
    number(data.length, 4, false),
    tag,
    data,
    number(crc32(concat([tag, data])), 4, false),
  ]);
}
export async function encodePNG(pixels, w, h, depth = 8) {
  checkImage(pixels, w, h);
  if (![8, 16].includes(depth))
    throw new Error("PNG bit depth must be 8 or 16");
  const stride = w * 4 * (depth / 8);
  const raw = new Uint8Array((stride + 1) * h);
  const view = new DataView(raw.buffer);
  const max = depth === 16 ? 65535 : 255;
  for (let y = 0; y < h; y++) {
    let target = y * (stride + 1) + 1;
    for (let x = 0; x < w * 4; x++) {
      const sample = pixels[y * w * 4 + x];
      const value = Math.round(
        Math.min(1, Math.max(0, Number.isFinite(sample) ? sample : 0)) * max,
      );
      if (depth === 16) {
        view.setUint16(target, value, false);
        target += 2;
      } else raw[target++] = value;
    }
  }
  const head = concat([
    number(w, 4, false),
    number(h, 4, false),
    new Uint8Array([depth, 6, 0, 0, 0]),
  ]);
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", head),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
}
const fp = new Float32Array(1);
const bits = new Uint32Array(fp.buffer);
function roundedShift(value, shift) {
  const base = value >>> shift;
  const remainder = value & (2 ** shift - 1);
  const midpoint = 2 ** (shift - 1);
  return (
    base +
    (remainder > midpoint || (remainder === midpoint && base & 1) ? 1 : 0)
  );
}
export function floatToHalf(value) {
  fp[0] = value;
  const b = bits[0],
    sign = (b >>> 16) & 0x8000,
    exponent = (b >>> 23) & 255,
    mantissa = b & 0x7fffff;
  if (exponent === 255) return sign | (mantissa ? 0x7e00 : 0x7c00);
  const e = exponent - 112;
  if (e >= 31) return sign | 0x7c00;
  if (e <= 0) {
    if (e < -10) return sign;
    return sign | roundedShift(mantissa | 0x800000, 14 - e);
  }
  return sign | ((e << 10) + roundedShift(mantissa, 13));
}
export function halfToFloat(bits) {
  const sign = bits & 0x8000 ? -1 : 1,
    e = (bits >>> 10) & 31,
    m = bits & 1023;
  return e === 31
    ? m
      ? NaN
      : sign * Infinity
    : e === 0
      ? sign * m * 2 ** -24
      : sign * (1 + m / 1024) * 2 ** (e - 15);
}
function attr(name, type, bytes) {
  return concat([cstring(name), cstring(type), number(bytes.length), bytes]);
}
function floatBytes(n) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, n, true);
  return bytes;
}
export function exrPrecondition(bytes) {
  const result = new Uint8Array(bytes.length);
  const split = Math.ceil(bytes.length / 2);
  for (let i = 0; i < bytes.length; i++)
    result[i % 2 === 0 ? i / 2 : split + (i - 1) / 2] = bytes[i];
  for (let i = result.length - 1; i > 0; i--)
    result[i] = (result[i] - result[i - 1] + 128) & 255;
  return result;
}
export async function encodeEXR(pixels, w, h, zip = true) {
  checkImage(pixels, w, h);
  const names = ["A", "B", "G", "R"],
    indices = [3, 2, 1, 0];
  const channels = concat([
    ...names.map((name) =>
      concat([
        cstring(name),
        number(1),
        new Uint8Array(4),
        number(1),
        number(1),
      ]),
    ),
    new Uint8Array(1),
  ]);
  const box = concat([number(0), number(0), number(w - 1), number(h - 1)]);
  const header = concat([
    number(20000630),
    number(2),
    attr("channels", "chlist", channels),
    attr("compression", "compression", new Uint8Array([zip ? 3 : 0])),
    attr("dataWindow", "box2i", box),
    attr("displayWindow", "box2i", box),
    attr("lineOrder", "lineOrder", new Uint8Array([0])),
    attr("pixelAspectRatio", "float", floatBytes(1)),
    attr("screenWindowCenter", "v2f", new Uint8Array(8)),
    attr("screenWindowWidth", "float", floatBytes(1)),
    new Uint8Array(1),
  ]);
  const lines = zip ? 16 : 1,
    blocks = [];
  for (let y = 0; y < h; y += lines) {
    const count = Math.min(lines, h - y);
    const raw = new Uint8Array(w * count * 8);
    const view = new DataView(raw.buffer);
    let o = 0;
    for (let row = 0; row < count; row++)
      for (const c of indices)
        for (let x = 0; x < w; x++) {
          view.setUint16(
            o,
            floatToHalf(pixels[((y + row) * w + x) * 4 + c]),
            true,
          );
          o += 2;
        }
    const compressed = zip ? await deflate(exrPrecondition(raw)) : raw;
    const payload = compressed.length < raw.length ? compressed : raw;
    blocks.push(concat([number(y), number(payload.length), payload]));
  }
  let offset = header.length + blocks.length * 8;
  const offsets = blocks.map((block) => {
    const b = number(offset, 8);
    offset += block.length;
    return b;
  });
  return concat([header, ...offsets, ...blocks]);
}
export function encodeZIP(entries) {
  if (!Array.isArray(entries) || entries.length > 65535)
    throw new Error("Too many ZIP entries");
  const local = [],
    central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    if (
      typeof name !== "string" ||
      name.length > 200 ||
      !name ||
      name.includes("..") ||
      /^[\\/]|:|\\/.test(name) ||
      !(data instanceof Uint8Array)
    )
      throw new Error("Invalid ZIP entry");
    const file = utf8.encode(name),
      crc = crc32(data);
    const common = concat([
      number(20, 2),
      number(0x800, 2),
      number(0, 2),
      number(0, 2),
      number(33, 2),
      number(crc),
      number(data.length),
      number(data.length),
      number(file.length, 2),
      number(0, 2),
    ]);
    const l = concat([number(0x04034b50), common, file, data]);
    local.push(l);
    central.push(
      concat([
        number(0x02014b50),
        number(20, 2),
        common,
        number(0, 2),
        number(0, 2),
        number(0, 2),
        number(0),
        number(offset),
        file,
      ]),
    );
    offset += l.length;
  }
  const directory = concat(central);
  return concat([
    ...local,
    directory,
    number(0x06054b50),
    number(0, 2),
    number(0, 2),
    number(entries.length, 2),
    number(entries.length, 2),
    number(directory.length),
    number(offset),
    number(0, 2),
  ]);
}
export function download(bytes, name, type = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
