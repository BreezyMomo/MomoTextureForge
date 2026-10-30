// TextureForge owns the motion scope; document data and timeline playback are separate.
import {createMotion} from './vendor/momo-workbench/motion.js';
const view=globalThis.window;
if(view?.document?.documentElement)view.document.documentElement.dataset.momoMotion='true';
const controller=createMotion({view});
// These selectors and class names describe TextureForge's inspector markup.
export const editorMotion={...controller,createReorderPreview(host,items,source,options={}){
 return controller.createReorderPreview(host,items,source,{
  headingSelector:':scope>summary .inspector-module-heading',summarySelector:':scope>summary',
  placeholderClass:'module-sort-placeholder',draggingClass:'module-dragging',...options,
 });
}};
export const {reducedMotion,animateUI,layoutRects,animateLayout,dragAutoScroll,createReorderPreview,dispose}=editorMotion;
