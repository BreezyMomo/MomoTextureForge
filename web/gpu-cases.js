// Deterministic pixel assertions executed by the browser validation page.
import { defaults, newLayer } from "./state.js";

export function checkCompositing(renderer) {
  const checks = [];
  const read = (s, time = 0) =>
    renderer.draw(s, 64, 64, { time, read: true, float: renderer.float });
  const check = (name, fn) => {
    try {
      fn();
      checks.push({ name, passed: true });
    } catch (error) {
      checks.push({ name, passed: false, error: error.message });
    }
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const finite = (p) => assert(p.every(Number.isFinite), "Non-finite pixel");
  const close = (a, b) => Math.abs(a - b) < 0.005;
  check("all nine blend modes, three layers, independent mask UV", () => {
    const s = defaults();
    s.output.mode = 1;
    s.layers = [newLayer("Checker"), newLayer("FBM"), newLayer("Ring")];
    s.layers[1].mask = "Circle";
    s.layers[1].maskUV[2] = 0.15;
    s.layers[1].opacity = 0.3;
    s.layers[2].opacity = 0.2;
    s.order = [2, 0, 1];
    for (let mode = 0; mode < 9; mode++) {
      s.layers[1].blend = mode;
      finite(read(s));
    }
  });
  check("mask gates an added layer outside the circle", () => {
    const s = defaults();
    s.output.mode = 1;
    s.layers[0] = newLayer("LinearGradient");
    const base = read(s);
    s.layers[1] = newLayer("FBM");
    s.layers[1].blend = 1;
    s.layers[1].mask = "Circle";
    const masked = read(s);
    assert(close(base[0], masked[0]), "Mask changed the outside corner");
    const center = (32 * 64 + 32) * 4;
    assert(masked[center] > base[center], "Added layer absent inside mask");
  });
  check("Sobel flat surface points towards positive Z", () => {
    const s = defaults();
    s.output.mode = 2;
    const p = read(s),
      i = (32 * 64 + 32) * 4;
    finite(p);
    assert(
      close(p[i], 0.5) && close(p[i + 1], 0.5) && close(p[i + 2], 1),
      "Incorrect flat normal",
    );
  });
  check("RGBA packs height, inverse height, zero and one", () => {
    const s = defaults();
    s.layers[0] = newLayer("FBM");
    s.output.mode = 3;
    s.output.channels = [0, 1, 5, 6];
    const p = read(s);
    finite(p);
    for (let i = 0; i < p.length; i += 4)
      assert(
        close(p[i] + p[i + 1], 1) && p[i + 2] === 0 && p[i + 3] === 1,
        "Channel mismatch",
      );
  });
  check("keyframe interpolation increases circle coverage", () => {
    const s = defaults();
    s.output.mode = 1;
    s.animation.tracks = {
      "layers.0.params.0": [
        [0, 0.2],
        [3, 0.8],
      ],
    };
    const coverage = (t) =>
      read(s, t).reduce((sum, v, i) => sum + (i % 4 === 0 ? v : 0), 0);
    const a = coverage(0),
      b = coverage(1.5),
      c = coverage(3);
    assert(a < b && b < c, "Keyframes did not change geometry");
  });
  check("UV translation moves the circle centre", () => {
    const s = defaults();
    s.output.mode = 1;
    s.layers[0].uv[2] = 0.2;
    const p = read(s);
    let mass = 0,
      moment = 0;
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const v = p[(y * 64 + x) * 4];
        mass += v;
        moment += (v * (x + 0.5)) / 64;
      }
    assert(moment / mass < 0.4, "Translation did not move the circle left");
  });
  check("height alpha follows scalar samples", () => {
    const s = defaults();
    s.layers[0] = newLayer("FBM");
    s.output.mode = 1;
    s.output.alpha = true;
    const p = read(s);
    for (let i = 0; i < p.length; i += 4)
      assert(close(p[i], p[i + 3]), "Alpha mismatch");
  });
  check(
    "heart has symmetric, straight lower edges with uniform feathering",
    () => {
      const s = defaults();
      s.layers[0] = newLayer("HeartLeafTeardrop");
      s.output.mode = 1;
      const size = 512;
      for (const softness of [0.015, 0.08]) {
        s.layers[0].params[3] = softness;
        const p = renderer.draw(s, size, size, {
          read: true,
          float: renderer.float,
        });
        finite(p);
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size / 2; x++)
            assert(
              close(p[(y * size + x) * 4], p[(y * size + size - 1 - x) * 4]),
              "Asymmetric heart contour",
            );
        const edges = [],
          feather = [];
        for (const qy of [-0.4, -0.3, -0.2]) {
          const y = Math.floor(((1 - qy) * size) / 2);
          const row = Array.from(
            { length: size / 2 },
            (_, x) => p[(y * size + size / 2 + x) * 4],
          );
          edges.push(row.findIndex((v) => v < 0.5));
          feather.push(row.filter((v) => v > 0.01 && v < 0.99).length);
        }
        assert(
          Math.abs(edges[2] - edges[1] - (edges[1] - edges[0])) <= 2,
          "Lower contour has a local bulge",
        );
        assert(
          Math.max(...feather) - Math.min(...feather) <= 2,
          "Feather width varies along the contour",
        );
        const belowTip = Math.floor(
          ((1 + s.layers[0].params[0] + softness + 0.01) * size) / 2,
        );
        assert(
          p[(belowTip * size + size / 2) * 4] === 0,
          "Feather creates a blob below the tip",
        );
      }
    },
  );
  check(
    "transparent heart has zero outside, opaque inside and soft edge alpha",
    () => {
      const s = defaults();
      s.layers[0] = newLayer("HeartLeafTeardrop");
      for (const mode of [0, 1, 4]) {
        s.output.mode = mode;
        s.output.alpha = true;
        const p = read(s);
        assert(p[3] === 0, "Outside heart is opaque");
        assert(
          p[(32 * 64 + 32) * 4 + 3] === 1,
          "Heart interior is transparent",
        );
        assert(
          p.some((v, i) => i % 4 === 3 && v > 0 && v < 1),
          "Feather has no intermediate alpha",
        );
        s.output.alpha = false;
        assert(
          read(s).every((v, i) => i % 4 !== 3 || v === 1),
          "Opaque option lost alpha",
        );
      }
    },
  );
  check(
    "background color changes RGB independently of transparency and data modes",
    () => {
      const s = defaults();
      s.layers[0] = newLayer("HeartLeafTeardrop");
      s.stops[0].color = "#804020";
      const p = read(s);
      assert(
        close(p[0], 128 / 255) &&
          close(p[1], 64 / 255) &&
          close(p[2], 32 / 255) &&
          p[3] === 1,
        "Background color ignored",
      );
      s.output.alpha = true;
      assert(read(s)[3] === 0, "Colored background prevents transparency");
      s.output.mode = 2;
      assert(
        read(s).every((v, i) => i % 4 !== 3 || v === 1),
        "Normal alpha was overridden",
      );
      s.output.mode = 3;
      assert(
        read(s).every((v, i) => i % 4 !== 3 || v === 1),
        "RGBA constant alpha was overridden",
      );
      s.output.channels[3] = 0;
      assert(read(s)[3] === 0, "RGBA height alpha ignored");
    },
  );
  check("vector masking uses neutral RG outside the mask", () => {
    const s = defaults();
    s.layers[0] = newLayer("RadialFlow");
    s.layers[0].mask = "Circle";
    const p = read(s);
    assert(
      close(p[0], 0.5) && close(p[1], 0.5),
      "Masked vector is not neutral",
    );
  });
  check("Brick keeps vertical joints aligned throughout each row", () => {
    const s = defaults();
    s.layers[0] = newLayer("Brick");
    s.layers[0].params[0] = 6;
    s.output.mode = 1;
    const size = 256,
      p = renderer.draw(s, size, size, { read: true, float: renderer.float });
    for (let row = 0; row < 6; row++) {
      const a = Math.floor((1 - (row + 0.25) / 6) * size),
        b = Math.floor((1 - (row + 0.75) / 6) * size);
      for (let x = 0; x < size; x++)
        assert(
          close(p[(a * size + x) * 4], p[(b * size + x) * 4]),
          "Vertical joint moved within a brick row",
        );
    }
    const runs = (values) =>
      values.filter((v, i) => v > 0.5 && (i === 0 || values[i - 1] <= 0.5))
        .length;
    const row = Math.floor((1 - 0.5 / 6) * size);
    assert(
      runs(Array.from({ length: size }, (_, x) => p[(row * size + x) * 4])) ===
        8,
      "Incorrect column count",
    );
    assert(
      runs(Array.from({ length: size }, (_, y) => p[(y * size + 8) * 4])) === 6,
      "Incorrect row count",
    );
    const row0 = Math.floor((1 - 0.5 / 6) * size),
      row1 = Math.floor((1 - 1.5 / 6) * size);
    assert(
      Array.from({ length: size }, (_, x) =>
        Math.abs(p[(row0 * size + x) * 4] - p[(row1 * size + x) * 4]),
      ).some((v) => v > 0.5),
      "Adjacent rows have no stagger",
    );
    s.layers[0].uv[2] = 1;
    s.layers[0].uv[3] = 1;
    const repeat = renderer.draw(s, size, size, {
      read: true,
      float: renderer.float,
    });
    assert(
      p.every((v, i) => close(v, repeat[i])),
      "Even-row brick does not repeat in UV",
    );
  });
  check("new geometry and FBM parameters affect actual pixels", () => {
    for (const [type, slot, value] of [
      ["Circle", 1, 0.3],
      ["RoundedRect", 5, 0.2],
      ["FBM", 0, 1],
      ["FBM", 4, 0.8],
    ]) {
      const s = defaults();
      s.layers[0] = newLayer(type);
      s.output.mode = 1;
      const before = read(s);
      s.layers[0].params[slot] = value;
      const after = read(s);
      assert(
        after.some((v, i) => Math.abs(v - before[i]) > 0.005),
        type + " parameter has no effect",
      );
    }
  });
  check(
    "gear tooth profiles keep tooth count and hole while changing contour",
    () => {
      const s = defaults();
      s.layers[0] = newLayer("Gear");
      s.output.mode = 1;
      const size = 512;
      const draw = () =>
        renderer.draw(s, size, size, { read: true, float: renderer.float });
      const mass = (p) =>
        p.reduce((sum, v, i) => sum + (i % 4 === 0 ? v : 0), 0);
      const images = [1, 0.4, 0].map((top) => {
        s.layers[0].params[6] = top;
        const p = draw();
        finite(p);
        assert(p[(256 * size + 256) * 4] === 0, "Gear hole filled in");
        const radius = s.layers[0].params[0] - s.layers[0].params[4] * 0.15;
        const ring = Array.from({ length: 720 }, (_, i) => {
          const a = (i * Math.PI * 2) / 720;
          const x = Math.floor(((1 + radius * Math.cos(a)) * size) / 2);
          const y = Math.floor(((1 - radius * Math.sin(a)) * size) / 2);
          return p[(y * size + x) * 4] > 0.5;
        });
        const teeth = ring.filter((v, i) => v && !ring[(i + 719) % 720]).length;
        assert(
          teeth === s.layers[0].params[2],
          "Tooth count changed with profile",
        );
        return p;
      });
      assert(
        mass(images[0]) > mass(images[1]) && mass(images[1]) > mass(images[2]),
        "Square, trapezoid and triangle contours are not distinct",
      );
      s.layers[0].params[5] = 0.8;
      assert(mass(draw()) > mass(images[2]), "Tooth width has no pixel effect");
      s.layers[0].params[6] = 0.7;
      assert(
        mass(draw()) > mass(images[2]),
        "Tooth top width has no pixel effect",
      );
      s.layers[0].mask = "Gear";
      s.layers[0].maskParams = [...s.layers[0].params];
      s.layers[0].maskParams[6] = 0;
      assert(
        mass(draw()) < mass(images[0]),
        "Independent triangular gear mask is ignored",
      );
    },
  );
  check("mask-specific circle radius changes masked coverage", () => {
    const s = defaults();
    s.layers[0] = newLayer("FBM");
    s.layers[0].mask = "Circle";
    s.output.mode = 1;
    s.layers[0].maskParams[0] = 0.2;
    const a = read(s).reduce((n, v, i) => n + (i % 4 === 0 ? v : 0), 0);
    s.layers[0].maskParams[0] = 0.8;
    const b = read(s).reduce((n, v, i) => n + (i % 4 === 0 ? v : 0), 0);
    assert(b > a * 2, "Mask parameters were ignored");
  });
  if (renderer.float)
    check("float framebuffer preserves HDR above one", () => {
      const s = defaults();
      s.output.mode = 1;
      s.post[0] = 2;
      const p = read(s);
      finite(p);
      assert(p[(32 * 64 + 32) * 4] > 2, "HDR was clamped");
    });
  return checks;
}
