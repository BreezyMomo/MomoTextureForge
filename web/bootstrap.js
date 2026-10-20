// A missing/invalid definition must be visible instead of leaving an empty editor.
document.getElementById("render-status").textContent = "正在加载图案定义与公式…";
try { const {restoreAssets}=await import('./resource-assets.js');await restoreAssets();await import("./tree-app.js"); }
catch (error) {
  const message = `工具初始化失败：${error.message}。请检查图案定义及公式文件，修复后刷新。`;
  document.getElementById("render-status").textContent = message;
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.hidden = false;
  console.error(error);
}
