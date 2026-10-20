import { defaults, newLayer } from "./state.js";
import { PERIODIC_PATTERNS, REPEATED_SHAPES } from "./seamless.js";

export async function checkSeamless(renderer, progress = () => {}) {
  const checks = [];
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
  const check = async (name, fn) => {
    try {
      await fn();
      checks.push({ name, passed: true });
    } catch (e) {
      checks.push({ name, passed: false, error: e.message });
    }
    progress(`${checks.length}/4 专项已完成`);
    await pause();
  };
  const read = (s, offset = [0, 0], time = 0.75) =>
    renderer.draw(s, 64, 64, {
      read: true,
      float: renderer.float,
      sampleOffset: offset,
      time,
    });
  const equal = (a, b) =>
    a.every((v, i) => Number.isFinite(v) && Math.abs(v - b[i]) < 0.01);
  await check(
    "native patterns and repeated shapes are periodic after transformed UV and animation",
    async () => {
      for (const type of [
        ...PERIODIC_PATTERNS,
        ...REPEATED_SHAPES,
        "Smoke",
        "LinearGradient",
      ]) {
        const s = defaults();
        s.output.mode = 1;
        s.output.seamless = true;
        s.layers[0] = newLayer(type);
        s.layers[0].uv = [1.37, 33, 0.4, -0.23, 0.17, 23, 1.1];
        if (type === "Brick") s.layers[0].params[0] = 7;
        if (type === "Checker") s.layers[0].params[2] = 5;
        if (type === "Gear") s.layers[0].params[6] = 0;
        const base = read(s);
        for (const offset of [
          [1, 0],
          [0, -1],
          [-1, 1],
        ])
          assert(equal(base, read(s, offset)), type + " has a UV period seam");
        const probe = (u, v) =>
          renderer.draw(s, 2, 2, {
            read: true,
            float: renderer.float,
            sampleOffset: [u - 0.25, v - 0.75],
            time: 0.75,
          })[0];
        for (const y of [0.17, 0.51]) {
          assert(
            Math.abs(probe(0.00001, y) - probe(0.99999, y)) < 0.03,
            type + " has a discontinuity at the X edge",
          );
          assert(
            Math.abs(probe(y, 0.00001) - probe(y, 0.99999)) < 0.03,
            type + " has a discontinuity at the Y edge",
          );
        }
        progress(`已检查 ${type} 周期`);
        await pause();
      }
    },
  );
  await check(
    "seamless switch changes nonperiodic FBM and supports native octave/gain controls",
    () => {
      const s = defaults();
      s.output.mode = 1;
      s.layers[0] = newLayer("FBM");
      const original = read(s);
      assert(
        !equal(original, read(s, [1, 0])),
        "Negative control: original FBM unexpectedly periodic",
      );
      s.output.seamless = true;
      const seamless = read(s);
      assert(
        !equal(original, seamless),
        "Seamless switch did not affect pixels",
      );
      for (const [slot, value] of [
        [0, 1],
        [4, 0.8],
      ]) {
        const changed = structuredClone(s);
        changed.layers[0].params[slot] = value;
        assert(
          !equal(seamless, read(changed)),
          "Periodic FBM parameter ignored",
        );
      }
    },
  );
  await check(
    "seamless composition includes masks, keyframes, alpha, normals and vectors",
    async () => {
      const s = defaults();
      s.output.seamless = true;
      s.output.alpha = true;
      s.layers = [newLayer("FBM"), newLayer("Brick"), newLayer("Gear")];
      s.layers[0].mask = "HeartLeafTeardrop";
      s.layers[0].maskParams = [...newLayer("HeartLeafTeardrop").params];
      s.layers[0].maskUV[2] = 0.4;
      s.layers[1].blend = 1;
      s.layers[1].opacity = 0.2;
      s.layers[1].params[0] = 7;
      s.layers[2].opacity = 0.3;
      s.animation.tracks = {
        "layers.1.params.0": [
          [0, 5],
          [3, 11],
        ],
      };
      for (const time of [0, 1.5, 3])
        for (const mode of [0, 1, 2, 3]) {
          progress(`正在检查合成：时间 ${time}，输出 ${mode}`);
          await pause();
          s.output.mode = mode;
          s.output.channels = [0, 2, 3, 0];
          const a = read(s, [0, 0], time),
            b = read(s, [1, 1], time);
          const error = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
          if (!equal(a, b) && mode === 2) {
            const hs = structuredClone(s);
            hs.output.mode = 5;
            const pa = renderer.draw(hs, 66, 66, {
              read: true,
              float: true,
              time,
              sampleScale: [66 / 64, 66 / 64],
              sampleOffset: [-1 / 64, -1 / 64],
            });
            const pb = renderer.draw(hs, 66, 66, {
              read: true,
              float: true,
              time,
              sampleScale: [66 / 64, 66 / 64],
              sampleOffset: [1 - 1 / 64, 1 - 1 / 64],
            });
            let index = 0;
            for (let j = 0; j < a.length; j++)
              if (Math.abs(a[j] - b[j]) > Math.abs(a[index] - b[index]))
                index = j;
            const x = Math.floor(index / 4) % 64,
              y = Math.floor(index / 4 / 64);
            const neighbours = (p) =>
              [-1, 0, 1].flatMap((dy) =>
                [-1, 0, 1].map((dx) => p[((y + 1 + dy) * 66 + x + 1 + dx) * 4]),
              );
            throw new Error(
              JSON.stringify({
                mode,
                time,
                error,
                x,
                y,
                a: Array.from(
                  a.slice(
                    Math.floor(index / 4) * 4,
                    Math.floor(index / 4) * 4 + 4,
                  ),
                ),
                b: Array.from(
                  b.slice(
                    Math.floor(index / 4) * 4,
                    Math.floor(index / 4) * 4 + 4,
                  ),
                ),
                padA: neighbours(pa),
                padB: neighbours(pb),
              }),
            );
          }
          assert(
            equal(a, b),
            `Composed output lost periodicity: mode ${mode}, t ${time}, max ${error}`,
          );
          progress(`合成：时间 ${time}，输出 ${mode}`);
          await pause();
        }
      const vector = defaults();
      vector.layers[0] = newLayer("RadialFlow");
      vector.output.seamless = true;
      vector.output.alpha = true;
      vector.layers[0].mask = "Gear";
      vector.layers[0].maskParams = [...newLayer("Gear").params];
      assert(
        equal(read(vector), read(vector, [1, -1])),
        "Vector output or mask has a seam",
      );
    },
  );
  await check(
    "edge blending matches boundary values and derivatives and preserves interior",
    () => {
      const s = defaults();
      s.layers[0] = newLayer("FBM");
      s.layers[0].params[0] = 1;
      s.output.mode = 1;
      s.output.seamMode = 1;
      const probe = (u, v) =>
        renderer.draw(s, 2, 2, {
          read: true,
          float: renderer.float,
          sampleOffset: [u - 0.25, v - 0.75],
          time: 0.75,
        })[0];
      const interior = probe(0.3, 0.3);
      s.output.seamless = true;
      assert(
        Math.abs(interior - probe(0.3, 0.3)) < 0.001,
        "Generic blend changed the unblended interior",
      );
      for (const axis of [0, 1]) {
        const f = (x) => (axis === 0 ? probe(x, 0.37) : probe(0.31, x)),
          e = 0.001;
        assert(Math.abs(f(0) - f(1)) < 0.001, "Boundary values mismatch");
        const left = (f(0) - f(-e)) / e,
          right = (f(e) - f(0)) / e;
        assert(Math.abs(left - right) < 0.2, "Boundary derivative mismatch");
      }
    },
  );
  return checks;
}
