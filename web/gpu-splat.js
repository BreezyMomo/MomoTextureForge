import { defaults, newLayer } from "./state.js";
import { BY_ID } from "./catalog.js";

// Actual renderer samples on either side of atan's branch cut, rather than
// a duplicated CPU implementation of the contour equation.
export function checkSplat(renderer) {
  const checks = [], assert = (ok, message) => { if (!ok) throw new Error(message); };
  const state = () => { const s = defaults(); s.layers[0] = newLayer("Splat"); s.output.mode = 1; return s; };
  const read = (s, offset = [0, 0]) => renderer.draw(s, 128, 128, {read: true, float: renderer.float, time: 0, sampleOffset: offset});
  const maxDifference = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
  const check = (name, fn) => { try { checks.push({name, passed: true, ...fn()}); } catch (error) { checks.push({name, passed: false, error: error.message}); } };
  const branchGap = (s, radius, rotation) => {
    const n = 1024, epsilon = 1e-6, vertical = rotation % 180 === 90;
    const sign = rotation < 180 ? -1 : 1, step = sign * radius * .55 / (2 * n);
    const along = .5 + sign * radius * .5 / 2;
    const pixels = renderer.draw(s, vertical ? 2 : n, vertical ? n : 2, {
      read: true, float: renderer.float, time: 0,
      sampleScale: vertical ? [epsilon * 2, step * n] : [step * n, epsilon * 2],
      sampleOffset: vertical ? [.5 - epsilon, along] : [along, .5 - epsilon],
    });
    let maximum = 0;
    for (let i = 0; i < n; i++) {
      const a = vertical ? i * 2 : i, b = vertical ? i * 2 + 1 : i + n;
      maximum = Math.max(maximum, Math.abs(pixels[a * 4] - pixels[b * 4]));
    }
    assert(Number.isFinite(maximum), "Non-finite branch samples");
    return maximum;
  };
  check("Splat contour is continuous across the angular cut for seeds/counts/radii/feather/rotation", () => {
    let maximum = 0, cases = 0;
    for (const seed of [1, 7, 23, 1000]) for (const count of [3, 8, 31]) for (const rotation of [0, 90, 180, 270]) {
      const s = state(), p = s.layers[0].params;
      p[0] = count === 8 ? .62 : count === 3 ? .2 : .95;
      p[2] = count; p[3] = count === 8 ? .015 : count === 3 ? .001 : .08; p[6] = seed;
      s.layers[0].uv[1] = rotation;
      maximum = Math.max(maximum, branchGap(s, p[0], rotation)); cases++;
    }
    assert(maximum < .015, `Angular cut jumps by ${maximum} across ${cases} cases`);
    return {cases, maximum};
  });
  check("Splat radius, integer spike count, seed and feather still change actual pixels", () => {
    const s = state(), original = read(s);
    for (const spec of BY_ID.get("Splat").parameters) {
      const altered = structuredClone(s);
      altered.layers[0].params[spec.slot] = spec.min + (spec.max - spec.min) * .65;
      if (spec.step === 1) altered.layers[0].params[spec.slot] = Math.round(altered.layers[0].params[spec.slot]);
      assert(maxDifference(original, read(altered)) > .02, `${spec.label} ignored`);
    }
    assert(maxDifference(original, read(s)) === 0, "Fixed seed is unstable");
    return {parameters: BY_ID.get("Splat").parameters.length};
  });
  check("Splat mask shares continuous contour; arranged/normal/transparent outputs remain finite and periodic", () => {
    const s = state(), layer = s.layers[0];
    layer.type = "Circle"; layer.params = [...newLayer("Circle").params]; layer.params[0] = 1.5;
    layer.mask = "Splat"; layer.maskParams = [...newLayer("Splat").params];
    const gap = branchGap(s, layer.maskParams[0], 0);
    assert(gap < .015, `Mask angular cut jumps by ${gap}`);
    layer.type = "Splat"; layer.params = [...layer.maskParams]; layer.mask = "";
    layer.arrange[0] = 1; layer.arrange[1] = 3; layer.arrange[2] = 2; layer.arrange[4] = .18;
    s.output.seamless = true; s.output.alpha = true;
    for (const mode of [0, 1, 2, 3]) {
      s.output.mode = mode; const pixels = read(s);
      assert(pixels.every(Number.isFinite), `Non-finite mode ${mode}`);
      assert(maxDifference(pixels, read(s, [1, -1])) < .01, `Arranged seam in mode ${mode}`);
      if (mode === 0) assert(pixels.some((v, i) => i % 4 === 3 && v === 0) && pixels.some((v, i) => i % 4 === 3 && v > .9), "Transparent shape alpha missing");
    }
    return {maskGap: gap, modes: 4};
  });
  return checks;
}
