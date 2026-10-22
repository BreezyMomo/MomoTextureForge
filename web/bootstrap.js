import {uiText} from './ui-language.js';
import {startupStage,completeStartup,failStartup} from './startup.js';
try {
 await startupStage(uiText("ui.readingGraphicsAndLocalResources"));
 const {restoreAssets}=await import('./resource-assets.js');await restoreAssets();
 await startupStage(uiText("ui.preparingEditor"));
 await import('./tree-app.js');
 await completeStartup();
}
catch (error) {
  failStartup(error);
  console.error(error);
}
