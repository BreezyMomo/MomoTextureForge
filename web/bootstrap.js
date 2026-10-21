import {startupStage,completeStartup,failStartup} from './startup.js';
try {
 await startupStage('正在读取图形与本地资源…');
 const {restoreAssets}=await import('./resource-assets.js');await restoreAssets();
 await startupStage('正在准备编辑器…');
 await import('./tree-app.js');
 await completeStartup();
}
catch (error) {
  failStartup(error);
  console.error(error);
}
