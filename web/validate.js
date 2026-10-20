import { Renderer } from "./renderer.js";
import { CATALOG } from "./catalog.js";
import { defaults, newLayer } from "./state.js";
import { encodePNG, encodeEXR, encodeZIP, download } from "./encoders.js";
import { checkCompositing } from "./gpu-cases.js";
import { checkSeamless } from "./gpu-seamless.js";
import { checkAuthoring } from "./gpu-authoring.js";
import { checkSplat } from "./gpu-splat.js";
import { authoringSamples } from "./authoring-samples.js";
import {pageHref} from "./distribution.js";
document.querySelector('a[href="/"]').href=pageHref("editor");
const result = document.getElementById("result");
let renderer = null,
  running = false,
  cancelled = false,
  report = null;
const pause = () => new Promise((resolve) => setTimeout(resolve, 20));
function init() {
  if (!renderer)
    renderer = new Renderer(document.getElementById("test-canvas"));
  return renderer;
}
function sample(type = "RadialGradient") {
  const s = defaults();
  s.layers[0] = newLayer(type);
  return s;
}
document.getElementById("stop").onclick = () => (cancelled = true);
document.getElementById("splat").onclick = () => {
  if (running) return;
  try { result.textContent = JSON.stringify({splat: checkSplat(init())}, null, 2); }
  catch (error) { result.textContent = error.stack; }
};
document.getElementById("composite").onclick = () => {
  try {
    const checks = checkCompositing(init());
    result.textContent = JSON.stringify({ compositing: checks }, null, 2);
    if (report) report.compositing = checks;
  } catch (error) {
    result.textContent = error.stack;
  }
};
document.getElementById("seamless").onclick = async () => {
  if (running) return;
  running = true;
  try {
    result.textContent = JSON.stringify(
      {
        seamless: await checkSeamless(
          init(),
          (text) => (result.textContent = text),
        ),
      },
      null,
      2,
    );
  } catch (error) {
    result.textContent = error.stack;
  } finally {
    running = false;
  }
};
document.getElementById("authoring").onclick = async () => {
  if (running) return;
  running = true;
  try { result.textContent = JSON.stringify({authoring:await checkAuthoring(init(),(text)=>result.textContent=text)},null,2); }
  catch(error){result.textContent=error.stack;}
  finally{running=false;}
};
document.getElementById("authoring-samples").onclick = async () => {
  if(running)return;
  running=true;
  try{
    const r=init(),files=[],samples=authoringSamples();
    for(const {name,state} of samples){
      const pixels=r.draw(state,256,256,{read:true,float:true,time:0});
      files.push({name:`${name}.png`,data:await encodePNG(pixels,256,256,8)});
      if(name==="radial"){
        files.push({name:"radial16.png",data:await encodePNG(pixels,256,256,16)});
        files.push({name:"radial.exr",data:await encodeEXR(pixels,256,256,true)});
      }
      result.textContent=`生成样本 ${name}`;await pause();
    }
    files.push({name:"states.json",data:new TextEncoder().encode(JSON.stringify(samples))});
    download(encodeZIP(files),"momo-authoring-samples.zip");result.textContent="新图形样本 ZIP 已生成";
  }catch(error){result.textContent=error.stack;}finally{running=false;}
};
document.getElementById("run").onclick = async () => {
  if (running) return;
  running = true;
  cancelled = false;
  const checks = [],
    failures = [],
    constant = [];
  const started = Date.now();
  try {
    const r = init();
    for (const type of CATALOG) {
      if (cancelled) break;
      const s = sample(type.id);
      try {
        const pixels = r.draw(s, 64, 64, {
          read: true,
          float: r.float,
          time: 0.75,
        });
        let min = Infinity,
          max = -Infinity,
          sum = 0;
        for (let i = 0; i < pixels.length; i++) {
          if (!Number.isFinite(pixels[i])) throw new Error("Non-finite sample");
          if (i % 4 === 0) {
            min = Math.min(min, pixels[i]);
            max = Math.max(max, pixels[i]);
            sum += pixels[i];
          }
        }
        if (max - min < 0.00001) constant.push(type.id);
        checks.push({ type: type.id, min, max, mean: sum / 4096 });
      } catch (error) {
        failures.push({ type: type.id, error: error.message });
      }
      result.textContent = `${checks.length + failures.length}/${CATALOG.length}：成功 ${checks.length}，失败 ${failures.length}，常量图案 ${constant.length}\n${failures
        .slice(-2)
        .map((f) => f.type + ": " + f.error)
        .join("\n")}`;
      await pause();
    }
    report = {
      schema: "momo-texture-browser-validation/v1",
      date: new Date().toISOString(),
      float: r.float,
      checked: checks.length + failures.length,
      checks,
      failures,
      constant,
      cancelled,
      elapsedMs: Date.now() - started,
    };
    result.textContent = JSON.stringify(
      { ...report, checks: undefined },
      null,
      2,
    );
    r.draw(sample("WebSigil"), 256, 256, { time: 0.75 });
  } catch (error) {
    result.textContent = error.stack;
  } finally {
    running = false;
  }
};
document.getElementById("png").onclick = async () => {
  try {
    const r = init();
    const pixels = r.draw(sample(), 256, 256, { read: true, float: true });
    download(await encodePNG(pixels, 256, 256, 16), "momo-test-gradient16.png");
    result.textContent = "PNG16 已生成；文件包含浮点渲染采样";
  } catch (error) {
    result.textContent = error.stack;
  }
};
document.getElementById("exr").onclick = async () => {
  try {
    const r = init();
    const pixels = r.draw(sample(), 256, 256, { read: true, float: true });
    download(await encodeEXR(pixels, 256, 256, true), "momo-test-gradient.exr");
    result.textContent = "ZIP16 EXR 已生成";
  } catch (error) {
    result.textContent = error.stack;
  }
};
document.getElementById("seam-samples").onclick = async () => {
  try {
    const r = init(),
      s = sample("FBM");
    s.output.seamless = true;
    s.layers[0].uv = [1.37, 33, 0.4, -0.23, 0.17, 23, 1.1];
    const pixels = r.draw(s, 256, 256, { read: true, float: true, time: 0.75 });
    const repeat = r.draw(s, 512, 512, {
      read: true,
      float: true,
      time: 0.75,
      tile: true,
    });
    const original = structuredClone(s);
    original.output.seamless = false;
    const before = r.draw(original, 256, 256, {
      read: true,
      float: true,
      time: 0.75,
    });
    const files = [
      { name: "seamless8.png", data: await encodePNG(pixels, 256, 256, 8) },
      { name: "seamless16.png", data: await encodePNG(pixels, 256, 256, 16) },
      { name: "seamless.exr", data: await encodeEXR(pixels, 256, 256, true) },
      { name: "repeat8.png", data: await encodePNG(repeat, 512, 512, 8) },
      { name: "original8.png", data: await encodePNG(before, 256, 256, 8) },
      { name: "state.json", data: new TextEncoder().encode(JSON.stringify(s)) },
    ];
    download(encodeZIP(files), "momo-seamless-samples.zip");
    result.textContent = "无缝样本 ZIP 已生成";
  } catch (error) {
    result.textContent = error.stack;
  }
};
document.getElementById("report").onclick = () => {
  if (!report) {
    result.textContent = "尚无验证记录";
    return;
  }
  download(
    new TextEncoder().encode(JSON.stringify(report, null, 2)),
    "momo-browser-validation.json",
    "application/json",
  );
};
// Repeatable validation entry for an explicitly opened local test URL.
if (new URLSearchParams(location.search).get("run") === "all")
  setTimeout(() => document.getElementById("run").click(), 100);
