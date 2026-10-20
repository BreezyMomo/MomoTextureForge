import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { encodePNG, encodeEXR, encodeZIP } from "../web/encoders.js";
const directory = path.resolve(process.argv[2] || "fixtures");
await mkdir(directory, { recursive: true });
const width = 19,
  height = 19,
  rgba = new Float32Array(width * height * 4);
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++)
    rgba.set([x / 16, y / 16, -0.5, 1], (y * width + x) * 4);
const entries = [];
for (const depth of [8, 16]) {
  const bytes = await encodePNG(rgba, width, height, depth);
  const name = `gradient${depth}.png`;
  await writeFile(path.join(directory, name), bytes);
  entries.push({ name, data: bytes });
}
for (const zip of [false, true])
  await writeFile(
    path.join(directory, zip ? "gradient-zip.exr" : "gradient-raw.exr"),
    await encodeEXR(rgba, width, height, zip),
  );
await writeFile(path.join(directory, "samples.zip"), encodeZIP(entries));
console.log(`Wrote independent-decoder fixtures to ${directory}`);
