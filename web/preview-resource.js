import {find} from './tree-model.js';
import {messageError} from './message-catalog.js';

// Saving follows the preview scope; selection alone never narrows a canvas save.
export function previewResourceRoot(project,{soloId=null,resourceEditing=false}={}){
 const root=project.root;
 if(soloId&&soloId!==root.id){const entry=find(root,soloId);if(!entry)throw messageError('unified.resourceMissing');return entry.node;}
 if(!root.children?.length)throw messageError('editor.addSomeContentNodesFirst');
 return resourceEditing&&root.children.length===1?root.children[0]:root;
}
