import"./chunk-WOT6VMZA.js";var a=`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Momo Texture Forge · 浏览器验证</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body style="padding: 24px; max-width: 900px; margin: auto">
    <h1>浏览器验证</h1>
    <p style="margin: 16px 0">
      使用实际 WebGL2
      渲染器逐项编译和采样全部图案。合成检查验证图层、蒙版、UV、关键帧、法线、RGBA
      与 HDR。结果可下载，不读取编辑器中的用户配置。
    </p>
    <a href="/" style="color: var(--teal)">返回编辑器</a>
    <div style="margin: 18px 0; display: flex; gap: 8px; flex-wrap: wrap">
      <button id="run">运行全部图案检查</button><button id="stop">取消</button
      ><button id="composite">检查合成与数据输出</button>
      <button id="seamless">检查无缝平铺</button>
      <button id="authoring">检查新图形与排列</button>
      <button id="splat">检查溅射轮廓断口</button>
      <button id="authoring-samples">下载新图形样本 ZIP</button>
      <button id="seam-samples">下载无缝样本 ZIP</button>
      <button id="png">下载 PNG16 样本</button
      ><button id="exr">下载 EXR 样本</button
      ><button id="report">下载验证记录</button>
    </div>
    <canvas
      id="test-canvas"
      width="256"
      height="256"
      aria-label="验证贴图"
    ></canvas>
    <pre id="result" style="white-space: pre-wrap; line-height: 1.8">
验证页已加载；等待运行</pre>
    <script type="module" src="validate.js"><\/script>
  </body>
</html>
`;export{a as default};
